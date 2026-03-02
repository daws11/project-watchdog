import { Router } from "express";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../db";
import { connections, projects } from "../db/schema";

type ChannelType = "whatsapp" | "google_meet" | "email" | "webhook";
type ConnectionStatus = "active" | "paused" | "error";

interface ChannelBase {
  id: string;
  name: string;
  type: ChannelType;
  description: string;
}

interface Channel extends ChannelBase {
  connectionCount: number;
  activeCount: number;
  hasErrors: boolean;
}

interface Connection {
  id: string;
  channelId: string;
  label: string;
  identifier: string;
  status: ConnectionStatus;
  lastSyncAt: string;
  messagesProcessed: number;
  error: string | null;
  createdAt: string;
}

interface NewConnectionData {
  label: string;
  identifier: string;
}

interface EditConnectionData {
  label: string;
  identifier: string;
}

// Static channel definitions (channel types available)
const channelBases: ChannelBase[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    type: "whatsapp",
    description: "Connect WhatsApp groups to monitor project conversations",
  },
  {
    id: "google_meet",
    name: "Google Meet",
    type: "google_meet",
    description: "Transcribe and analyze meeting recordings",
  },
  {
    id: "email",
    name: "Email",
    type: "email",
    description: "Monitor email threads for project updates",
  },
  {
    id: "webhook",
    name: "Webhook",
    type: "webhook",
    description: "Receive updates via custom webhook integrations",
  },
];

async function computeChannels(): Promise<Channel[]> {
  const dbConnections = await db.select().from(connections);

  return channelBases.map((ch) => {
    const channelConnections = dbConnections.filter(
      (c) => c.channelType === ch.type,
    );
    const connectionCount = channelConnections.length;
    const activeCount = channelConnections.filter(
      (c) => c.status === "active",
    ).length;
    const hasErrors = channelConnections.some((c) => c.status === "error");

    return {
      ...ch,
      connectionCount,
      activeCount,
      hasErrors,
    };
  });
}

const router = Router();

const WHATSAPP_GROUP_ID_PATTERN = /@g\.us$/i;

function toConnectionResponse(c: typeof connections.$inferSelect): Connection {
  return {
    id: c.id.toString(),
    channelId: c.channelType,
    label: c.label,
    identifier: c.identifier,
    status: c.status as ConnectionStatus,
    lastSyncAt: c.lastSyncAt?.toISOString() || c.createdAt.toISOString(),
    messagesProcessed: c.messagesProcessed,
    error: c.error,
    createdAt: c.createdAt.toISOString(),
  };
}

function validateIdentifier(channelId: string, identifier: string): string | null {
  if (channelId === "whatsapp" && !WHATSAPP_GROUP_ID_PATTERN.test(identifier)) {
    return "WhatsApp identifier must be a valid group ID ending with @g.us";
  }
  return null;
}

// GET /api/sources — channels + current connections
router.get("/", async (_req, res) => {
  try {
    const channels = await computeChannels();
    const dbConnections = await db.select().from(connections);
    const formattedConnections: Connection[] =
      dbConnections.map(toConnectionResponse);

    res.json({ channels, connections: formattedConnections });
  } catch (error) {
    console.error("[Sources] Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

// POST /api/sources/:channelId/connections — add connection
router.post("/:channelId/connections", async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const channelExists = channelBases.some((c) => c.id === channelId);
    if (!channelExists) {
      return res.status(404).json({ error: "Channel not found" });
    }

    const body = req.body as Partial<NewConnectionData>;
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const identifier =
      typeof body.identifier === "string" ? body.identifier.trim() : "";

    if (!label || !identifier) {
      return res
        .status(400)
        .json({ error: "label and identifier are required" });
    }

    const identifierValidationError = validateIdentifier(channelId, identifier);
    if (identifierValidationError) {
      return res.status(400).json({ error: identifierValidationError });
    }

    const duplicateConnection = await db.query.connections.findFirst({
      where: and(
        eq(connections.channelType, channelId),
        eq(connections.identifier, identifier),
      ),
    });
    if (duplicateConnection) {
      return res.status(409).json({
        error: "A connection with this identifier already exists",
      });
    }

    // Create or get default project
    // TODO: In Phase 4+, allow user to select project
    let project = await db.query.projects.findFirst();
    if (!project) {
      const [newProject] = await db
        .insert(projects)
        .values({
          name: "Default Project",
          healthScore: 100,
        })
        .returning();
      project = newProject;
    }

    const [newConnection] = await db
      .insert(connections)
      .values({
        projectId: project.id,
        channelType: channelId,
        label,
        identifier,
        status: "active",
        lastSyncAt: new Date(),
        messagesProcessed: 0,
      })
      .returning();

    const connection: Connection = {
      ...toConnectionResponse(newConnection),
    };

    res.status(201).json({ connection });
  } catch (error) {
    console.error("[Sources] Error creating connection:", error);
    res.status(500).json({ error: "Failed to create connection" });
  }
});

// PUT /api/sources/connections/:connectionId — edit settings
router.put("/connections/:connectionId", async (req, res) => {
  try {
    const connectionId = Number.parseInt(req.params.connectionId, 10);
    if (Number.isNaN(connectionId)) {
      return res.status(400).json({ error: "Invalid connection ID" });
    }

    const body = req.body as Partial<EditConnectionData>;
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const identifier =
      typeof body.identifier === "string" ? body.identifier.trim() : "";

    if (!label || !identifier) {
      return res
        .status(400)
        .json({ error: "label and identifier are required" });
    }

    const existingConnection = await db.query.connections.findFirst({
      where: eq(connections.id, connectionId),
    });
    if (!existingConnection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    const identifierValidationError = validateIdentifier(
      existingConnection.channelType,
      identifier,
    );
    if (identifierValidationError) {
      return res.status(400).json({ error: identifierValidationError });
    }

    const duplicateConnection = await db.query.connections.findFirst({
      where: and(
        eq(connections.channelType, existingConnection.channelType),
        eq(connections.identifier, identifier),
        ne(connections.id, connectionId),
      ),
    });
    if (duplicateConnection) {
      return res.status(409).json({
        error: "A connection with this identifier already exists",
      });
    }

    const [updated] = await db
      .update(connections)
      .set({ label, identifier })
      .where(eq(connections.id, connectionId))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: "Connection not found" });
    }

    const connection: Connection = toConnectionResponse(updated);

    res.json({ connection });
  } catch (error) {
    console.error("[Sources] Error updating connection:", error);
    res.status(500).json({ error: "Failed to update connection" });
  }
});

// POST /api/sources/connections/:connectionId/pause
router.post("/connections/:connectionId/pause", async (req, res) => {
  try {
    const connectionId = Number.parseInt(req.params.connectionId, 10);
    if (Number.isNaN(connectionId)) {
      return res.status(400).json({ error: "Invalid connection ID" });
    }

    const conn = await db.query.connections.findFirst({
      where: eq(connections.id, connectionId),
    });

    if (!conn) {
      return res.status(404).json({ error: "Connection not found" });
    }

    if (conn.status !== "active") {
      return res
        .status(400)
        .json({ error: "Only active connections can be paused" });
    }

    const [updated] = await db
      .update(connections)
      .set({ status: "paused" })
      .where(eq(connections.id, connectionId))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: "Connection not found" });
    }

    const connection: Connection = toConnectionResponse(updated);

    res.json({ connection });
  } catch (error) {
    console.error("[Sources] Error pausing connection:", error);
    res.status(500).json({ error: "Failed to pause connection" });
  }
});

// POST /api/sources/connections/:connectionId/resume
router.post("/connections/:connectionId/resume", async (req, res) => {
  try {
    const connectionId = Number.parseInt(req.params.connectionId, 10);
    if (Number.isNaN(connectionId)) {
      return res.status(400).json({ error: "Invalid connection ID" });
    }

    const conn = await db.query.connections.findFirst({
      where: eq(connections.id, connectionId),
    });

    if (!conn) {
      return res.status(404).json({ error: "Connection not found" });
    }

    if (conn.status !== "paused") {
      return res
        .status(400)
        .json({ error: "Only paused connections can be resumed" });
    }

    const [updated] = await db
      .update(connections)
      .set({ status: "active" })
      .where(eq(connections.id, connectionId))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: "Connection not found" });
    }

    const connection: Connection = toConnectionResponse(updated);

    res.json({ connection });
  } catch (error) {
    console.error("[Sources] Error resuming connection:", error);
    res.status(500).json({ error: "Failed to resume connection" });
  }
});

// POST /api/sources/connections/:connectionId/retry
router.post("/connections/:connectionId/retry", async (req, res) => {
  try {
    const connectionId = Number.parseInt(req.params.connectionId, 10);
    if (Number.isNaN(connectionId)) {
      return res.status(400).json({ error: "Invalid connection ID" });
    }

    const conn = await db.query.connections.findFirst({
      where: eq(connections.id, connectionId),
    });

    if (!conn) {
      return res.status(404).json({ error: "Connection not found" });
    }

    if (conn.status !== "error") {
      return res
        .status(400)
        .json({ error: "Only errored connections can be retried" });
    }

    const [updated] = await db
      .update(connections)
      .set({
        status: "active",
        error: null,
        lastSyncAt: new Date(),
      })
      .where(eq(connections.id, connectionId))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: "Connection not found" });
    }

    const connection: Connection = toConnectionResponse(updated);

    res.json({ connection });
  } catch (error) {
    console.error("[Sources] Error retrying connection:", error);
    res.status(500).json({ error: "Failed to retry connection" });
  }
});

// DELETE /api/sources/connections/:connectionId — disconnect
router.delete("/connections/:connectionId", async (req, res) => {
  try {
    const connectionId = Number.parseInt(req.params.connectionId, 10);
    if (Number.isNaN(connectionId)) {
      return res.status(400).json({ error: "Invalid connection ID" });
    }

    const deleted = await db
      .delete(connections)
      .where(eq(connections.id, connectionId))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Connection not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Sources] Error deleting connection:", error);
    res.status(500).json({ error: "Failed to delete connection" });
  }
});

export { router as sourcesRouter };

