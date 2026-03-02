import { Router } from "express";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  apiKeys,
  connections,
  fonnteGroups,
  projects,
  smtpSettings as smtpSettingsTable,
  tasks,
  users,
} from "../db/schema";
import { encryptSecret } from "../utils/crypto";
import { fonnteService } from "../services/fonnte";

type UserRole = "admin" | "regular";
type UserStatus = "active" | "inactive";
type SmtpEncryption = "none" | "ssl" | "starttls";

interface ApiKey {
  id: string;
  service: string;
  maskedKey: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  encryption: SmtpEncryption;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastActiveAt: string;
  sectionPermissions: string[];
  assignedPeopleIds: string[];
}

interface SectionOption {
  id: string;
  label: string;
}

interface PersonOption {
  id: string;
  name: string;
}

interface SettingsSnapshot {
  apiKeys: ApiKey[];
  smtpSettings: SmtpSettings;
  users: SystemUser[];
  availableSections: SectionOption[];
  availablePeople: PersonOption[];
}

interface ApiKeyFormData {
  service: string;
  key: string;
}

interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  sectionPermissions: string[];
  assignedPeopleIds: string[];
}

interface WhatsappGroupItem {
  id: string;
  name: string;
  imported: boolean;
  connectionId: string | null;
}

interface WhatsappGroupsResponse {
  groups: WhatsappGroupItem[];
  lastSyncedAt: string | null;
}
const SALT_ROUNDS = 10;
const SMTP_SETTINGS_ID = 1;

const availableSections: SectionOption[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "people", label: "People" },
  { id: "tasks", label: "Tasks" },
  { id: "sources", label: "Sources" },
  { id: "processing", label: "Processing" },
  { id: "settings", label: "Settings" },
  { id: "reports", label: "Reports" },
];

function maskKey(raw: string): string {
  const key = raw.trim();
  if (!key) return "****";
  if (key.length <= 8) return "****";
  return `...${key.slice(-4)}`;
}

const router = Router();

async function ensureDefaultProjectId(): Promise<number> {
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

  return project.id;
}

async function getWhatsappGroupsView(): Promise<WhatsappGroupsResponse> {
  const [dbGroups, whatsappConnections] = await Promise.all([
    db.select().from(fonnteGroups).orderBy(fonnteGroups.name),
    db
      .select({
        id: connections.id,
        identifier: connections.identifier,
      })
      .from(connections)
      .where(eq(connections.channelType, "whatsapp")),
  ]);

  const connectionByIdentifier = new Map(
    whatsappConnections.map((c) => [c.identifier, c.id]),
  );
  const groups: WhatsappGroupItem[] = dbGroups.map((group) => ({
    id: group.groupId,
    name: group.name,
    imported: connectionByIdentifier.has(group.groupId),
    connectionId: connectionByIdentifier.get(group.groupId)?.toString() ?? null,
  }));

  const lastSyncedAt =
    dbGroups.length > 0
      ? dbGroups
          .reduce(
            (latest, current) =>
              current.lastFetchedAt > latest ? current.lastFetchedAt : latest,
            dbGroups[0].lastFetchedAt,
          )
          .toISOString()
      : null;

  return { groups, lastSyncedAt };
}

async function getSmtpSettings(): Promise<SmtpSettings> {
  const existing = await db
    .select()
    .from(smtpSettingsTable)
    .orderBy(desc(smtpSettingsTable.updatedAt))
    .limit(1);

  if (existing.length === 0) {
    return {
      host: "",
      port: 587,
      username: "",
      password: "",
      fromAddress: "",
      encryption: "starttls",
    };
  }

  const row = existing[0];
  return {
    host: row.host,
    port: row.port,
    username: row.username,
    password: row.password,
    fromAddress: row.fromAddress,
    encryption: row.encryption as SmtpEncryption,
  };
}

// GET /api/settings — full settings snapshot
router.get("/", async (_req, res) => {
  try {
    const smtpSettings = await getSmtpSettings();

    // Get API keys
    const dbApiKeys = await db.select().from(apiKeys);
    const formattedApiKeys: ApiKey[] = dbApiKeys.map((k) => ({
      id: k.id.toString(),
      service: k.service,
      maskedKey: k.maskedKey,
      createdAt: k.createdAt.toISOString(),
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    }));

    // Get users
    const dbUsers = await db.select().from(users);
    const formattedUsers: SystemUser[] = dbUsers.map((u) => ({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      role: u.role as UserRole,
      status: u.active ? ("active" as const) : ("inactive" as const),
      lastActiveAt: u.createdAt.toISOString(),
      sectionPermissions: u.sectionPermissions,
      assignedPeopleIds: u.assignedPeopleIds,
    }));

    // Get available people from tasks
    const peopleWithTasks = await db
      .select({
        owner: tasks.owner,
      })
      .from(tasks)
      .where(sql`${tasks.owner} is not null`)
      .groupBy(tasks.owner);

    const availablePeople: PersonOption[] = peopleWithTasks.map((p, idx) => ({
      id: `person-${idx + 1}`,
      name: p.owner || "Unknown",
    }));

    const snapshot: SettingsSnapshot = {
      apiKeys: formattedApiKeys,
      smtpSettings,
      users: formattedUsers,
      availableSections,
      availablePeople,
    };

    res.json(snapshot);
  } catch (error) {
    console.error("[Settings] Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// GET /api/settings/whatsapp-groups — cached list + import status
router.get("/whatsapp-groups", async (_req, res) => {
  try {
    const view = await getWhatsappGroupsView();
    res.json(view);
  } catch (error) {
    console.error("[Settings] Error fetching WhatsApp groups:", error);
    res.status(500).json({ error: "Failed to fetch WhatsApp groups" });
  }
});

// POST /api/settings/whatsapp-groups/sync — refresh from Fonnte + bulk import all groups
router.post("/whatsapp-groups/sync", async (_req, res) => {
  try {
    await fonnteService.updateWhatsappGroupList();
    const groups = await fonnteService.getWhatsappGroupList();
    const now = new Date();

    // 1) Cache groups
    for (const group of groups) {
      await db
        .insert(fonnteGroups)
        .values({
          groupId: group.id,
          name: group.name,
          lastFetchedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: fonnteGroups.groupId,
          set: {
            name: group.name,
            lastFetchedAt: now,
            updatedAt: now,
          },
        });
    }

    // 2) Bulk import groups as active WhatsApp connections (skip duplicates)
    let insertedConnections = 0;
    let skippedExisting = 0;

    if (groups.length > 0) {
      const identifiers = groups.map((g) => g.id);
      const existingConnections = await db
        .select({
          identifier: connections.identifier,
        })
        .from(connections)
        .where(
          and(
            eq(connections.channelType, "whatsapp"),
            inArray(connections.identifier, identifiers),
          ),
        );
      const existingIdentifierSet = new Set(
        existingConnections.map((connection) => connection.identifier),
      );

      const projectId = await ensureDefaultProjectId();
      const rowsToInsert = groups
        .filter((group) => {
          if (existingIdentifierSet.has(group.id)) {
            skippedExisting += 1;
            return false;
          }
          return true;
        })
        .map((group) => ({
          projectId,
          channelType: "whatsapp",
          label: group.name.trim() || group.id,
          identifier: group.id,
          status: "active",
          lastSyncAt: now,
          messagesProcessed: 0,
          reportTime: "18:00",
        }));

      if (rowsToInsert.length > 0) {
        const inserted = await db.insert(connections).values(rowsToInsert).returning();
        insertedConnections = inserted.length;
      }
    }

    const view = await getWhatsappGroupsView();
    res.json({
      fetchedCount: groups.length,
      insertedConnections,
      skippedExisting,
      ...view,
    });
  } catch (error) {
    console.error("[Settings] Error syncing WhatsApp groups:", error);
    const message =
      error instanceof Error ? error.message : "Failed to sync WhatsApp groups";
    res.status(500).json({ error: message });
  }
});

// POST /api/settings/api-keys — add API key
router.post("/api-keys", async (req, res) => {
  try {
    const body = req.body as Partial<ApiKeyFormData>;
    const service = typeof body.service === "string" ? body.service.trim() : "";
    const key = typeof body.key === "string" ? body.key.trim() : "";

    if (!service || !key) {
      return res.status(400).json({ error: "service and key are required" });
    }

    const masked = maskKey(key);
    const encrypted = encryptSecret(key);

    const [newKey] = await db
      .insert(apiKeys)
      .values({
        service,
        maskedKey: masked,
        encryptedKey: encrypted.encryptedValue,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      })
      .returning();

    const apiKey: ApiKey = {
      id: newKey.id.toString(),
      service: newKey.service,
      maskedKey: newKey.maskedKey,
      createdAt: newKey.createdAt.toISOString(),
      lastUsedAt: newKey.lastUsedAt?.toISOString() ?? null,
    };

    res.status(201).json({ apiKey });
  } catch (error) {
    console.error("[Settings] Error adding API key:", error);
    res.status(500).json({ error: "Failed to add API key" });
  }
});

// DELETE /api/settings/api-keys/:keyId — delete API key
router.delete("/api-keys/:keyId", async (req, res) => {
  try {
    const keyId = Number.parseInt(req.params.keyId, 10);
    if (Number.isNaN(keyId)) {
      return res.status(400).json({ error: "Invalid key ID" });
    }

    const deleted = await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: "API key not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Settings] Error deleting API key:", error);
    res.status(500).json({ error: "Failed to delete API key" });
  }
});

// PUT /api/settings/smtp — save SMTP settings
router.put("/smtp", async (req, res) => {
  try {
    const body = req.body as Partial<SmtpSettings>;

    const current = await getSmtpSettings();
    const nextSettings: SmtpSettings = {
      host: typeof body.host === "string" ? body.host.trim() : current.host,
      port: typeof body.port === "number" ? body.port : current.port,
      username: typeof body.username === "string" ? body.username.trim() : current.username,
      password: typeof body.password === "string" ? body.password : current.password,
      fromAddress:
        typeof body.fromAddress === "string" ? body.fromAddress.trim() : current.fromAddress,
      encryption:
        body.encryption === "none" || body.encryption === "ssl" || body.encryption === "starttls"
          ? body.encryption
          : current.encryption,
    };

    const [saved] = await db
      .insert(smtpSettingsTable)
      .values({
        id: SMTP_SETTINGS_ID,
        host: nextSettings.host,
        port: nextSettings.port,
        username: nextSettings.username,
        password: nextSettings.password,
        fromAddress: nextSettings.fromAddress,
        encryption: nextSettings.encryption,
      })
      .onConflictDoUpdate({
        target: smtpSettingsTable.id,
        set: {
          host: nextSettings.host,
          port: nextSettings.port,
          username: nextSettings.username,
          password: nextSettings.password,
          fromAddress: nextSettings.fromAddress,
          encryption: nextSettings.encryption,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({
      smtpSettings: {
        host: saved.host,
        port: saved.port,
        username: saved.username,
        password: saved.password,
        fromAddress: saved.fromAddress,
        encryption: saved.encryption,
      },
    });
  } catch (error) {
    console.error("[Settings] Error updating SMTP:", error);
    res.status(500).json({ error: "Failed to update SMTP settings" });
  }
});

// POST /api/settings/smtp/test — test SMTP connection
router.post("/smtp/test", async (_req, res) => {
  try {
    const smtpSettings = await getSmtpSettings();
    if (!smtpSettings.host || !smtpSettings.username || !smtpSettings.fromAddress) {
      return res.status(400).json({ error: "SMTP settings are incomplete" });
    }

    const secure = smtpSettings.encryption === "ssl";
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure,
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
      requireTLS: smtpSettings.encryption === "starttls",
    });

    await transporter.verify();
    res.json({ success: true });
  } catch (error) {
    console.error("[Settings] Error testing SMTP:", error);
    res.status(500).json({ error: "Failed to test SMTP" });
  }
});

// POST /api/settings/users — create user
router.post("/users", async (req, res) => {
  try {
    const body = req.body as Partial<UserFormData>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const role = body.role === "admin" || body.role === "regular" ? body.role : "regular";
    const password = typeof body.password === "string" ? body.password : "";
    const sectionPermissions = Array.isArray(body.sectionPermissions) ? body.sectionPermissions : [];
    const assignedPeopleIds = Array.isArray(body.assignedPeopleIds) ? body.assignedPeopleIds : [];

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ error: "password is required and must be at least 8 characters" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role,
        sectionPermissions,
        assignedPeopleIds,
        active: true,
      })
      .returning();

    const user: SystemUser = {
      id: newUser.id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role as UserRole,
      status: "active",
      lastActiveAt: newUser.createdAt.toISOString(),
      sectionPermissions: newUser.sectionPermissions,
      assignedPeopleIds: newUser.assignedPeopleIds,
    };

    res.status(201).json({ user });
  } catch (error) {
    console.error("[Settings] Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT /api/settings/users/:userId — edit user
router.put("/users/:userId", async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const body = req.body as Partial<UserFormData>;
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const email = typeof body.email === "string" ? body.email.trim() : undefined;
    const role = body.role === "admin" || body.role === "regular" ? body.role : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;
    const sectionPermissions = Array.isArray(body.sectionPermissions) ? body.sectionPermissions : undefined;
    const assignedPeopleIds = Array.isArray(body.assignedPeopleIds) ? body.assignedPeopleIds : undefined;

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (sectionPermissions) updates.sectionPermissions = sectionPermissions;
    if (assignedPeopleIds) updates.assignedPeopleIds = assignedPeopleIds;
    if (password && password.length >= 8) {
      updates.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    const user: SystemUser = {
      id: updated.id.toString(),
      name: updated.name,
      email: updated.email,
      role: updated.role as UserRole,
      status: updated.active ? "active" : "inactive",
      lastActiveAt: updated.createdAt.toISOString(),
      sectionPermissions: updated.sectionPermissions,
      assignedPeopleIds: updated.assignedPeopleIds,
    };

    res.json({ user });
  } catch (error) {
    console.error("[Settings] Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// POST /api/settings/users/:userId/deactivate — deactivate user
router.post("/users/:userId/deactivate", async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const [updated] = await db
      .update(users)
      .set({ active: false })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    const user: SystemUser = {
      id: updated.id.toString(),
      name: updated.name,
      email: updated.email,
      role: updated.role as UserRole,
      status: "inactive",
      lastActiveAt: updated.createdAt.toISOString(),
      sectionPermissions: updated.sectionPermissions,
      assignedPeopleIds: updated.assignedPeopleIds,
    };

    res.json({ user });
  } catch (error) {
    console.error("[Settings] Error deactivating user:", error);
    res.status(500).json({ error: "Failed to deactivate user" });
  }
});

// POST /api/settings/users/:userId/reactivate — reactivate user
router.post("/users/:userId/reactivate", async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const [updated] = await db
      .update(users)
      .set({ active: true })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    const user: SystemUser = {
      id: updated.id.toString(),
      name: updated.name,
      email: updated.email,
      role: updated.role as UserRole,
      status: "active",
      lastActiveAt: updated.createdAt.toISOString(),
      sectionPermissions: updated.sectionPermissions,
      assignedPeopleIds: updated.assignedPeopleIds,
    };

    res.json({ user });
  } catch (error) {
    console.error("[Settings] Error reactivating user:", error);
    res.status(500).json({ error: "Failed to reactivate user" });
  }
});

export { router as settingsRouter };
