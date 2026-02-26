import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

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

const __dirname = dirname(fileURLToPath(import.meta.url));

const samplePath = resolve(
  __dirname,
  "../../../../product-plan/sections/sources/sample-data.json",
);
const sampleData = JSON.parse(readFileSync(samplePath, "utf-8")) as {
  channels: Channel[];
  connections: Connection[];
};

const channelBases: ChannelBase[] = (sampleData.channels ?? []).map((c) => ({
  id: c.id,
  name: c.name,
  type: c.type,
  description: c.description,
}));

let connections: Connection[] = [...(sampleData.connections ?? [])];

function computeChannels(): Channel[] {
  return channelBases.map((ch) => {
    const channelConnections = connections.filter((c) => c.channelId === ch.id);
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

function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const router = Router();

// GET /api/sources — channels + current connections
router.get("/", (_req, res) => {
  res.json({ channels: computeChannels(), connections });
});

// POST /api/sources/:channelId/connections — add connection
router.post("/:channelId/connections", (req, res) => {
  const channelId = req.params.channelId;
  const channelExists = channelBases.some((c) => c.id === channelId);
  if (!channelExists) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }

  const body = req.body as Partial<NewConnectionData>;
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const identifier =
    typeof body.identifier === "string" ? body.identifier.trim() : "";

  if (!label || !identifier) {
    res.status(400).json({ error: "label and identifier are required" });
    return;
  }

  const now = new Date().toISOString();
  const connection: Connection = {
    id: randomId("conn"),
    channelId,
    label,
    identifier,
    status: "active",
    lastSyncAt: now,
    messagesProcessed: 0,
    error: null,
    createdAt: now,
  };

  connections = [connection, ...connections];
  res.status(201).json({ connection });
});

// PUT /api/sources/connections/:connectionId — edit settings
router.put("/connections/:connectionId", (req, res) => {
  const connectionId = req.params.connectionId;
  const idx = connections.findIndex((c) => c.id === connectionId);
  if (idx === -1) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }

  const body = req.body as Partial<EditConnectionData>;
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const identifier =
    typeof body.identifier === "string" ? body.identifier.trim() : "";

  if (!label || !identifier) {
    res.status(400).json({ error: "label and identifier are required" });
    return;
  }

  const updated: Connection = { ...connections[idx], label, identifier };
  connections = connections.map((c) => (c.id === connectionId ? updated : c));
  res.json({ connection: updated });
});

// POST /api/sources/connections/:connectionId/pause
router.post("/connections/:connectionId/pause", (req, res) => {
  const connectionId = req.params.connectionId;
  const conn = connections.find((c) => c.id === connectionId);
  if (!conn) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }
  if (conn.status !== "active") {
    res.status(400).json({ error: "Only active connections can be paused" });
    return;
  }
  const updated: Connection = { ...conn, status: "paused" };
  connections = connections.map((c) => (c.id === connectionId ? updated : c));
  res.json({ connection: updated });
});

// POST /api/sources/connections/:connectionId/resume
router.post("/connections/:connectionId/resume", (req, res) => {
  const connectionId = req.params.connectionId;
  const conn = connections.find((c) => c.id === connectionId);
  if (!conn) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }
  if (conn.status !== "paused") {
    res.status(400).json({ error: "Only paused connections can be resumed" });
    return;
  }
  const updated: Connection = { ...conn, status: "active" };
  connections = connections.map((c) => (c.id === connectionId ? updated : c));
  res.json({ connection: updated });
});

// POST /api/sources/connections/:connectionId/retry
router.post("/connections/:connectionId/retry", (req, res) => {
  const connectionId = req.params.connectionId;
  const conn = connections.find((c) => c.id === connectionId);
  if (!conn) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }
  if (conn.status !== "error") {
    res.status(400).json({ error: "Only errored connections can be retried" });
    return;
  }
  const updated: Connection = {
    ...conn,
    status: "active",
    error: null,
    lastSyncAt: new Date().toISOString(),
  };
  connections = connections.map((c) => (c.id === connectionId ? updated : c));
  res.json({ connection: updated });
});

// DELETE /api/sources/connections/:connectionId — disconnect
router.delete("/connections/:connectionId", (req, res) => {
  const connectionId = req.params.connectionId;
  const before = connections.length;
  connections = connections.filter((c) => c.id !== connectionId);
  if (connections.length === before) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }
  res.json({ success: true });
});

export { router as sourcesRouter };

