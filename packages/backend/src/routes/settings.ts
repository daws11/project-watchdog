import { Router } from "express";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  apiKeys,
  llmProviders,
  smtpSettings as smtpSettingsTable,
  tasks,
  users,
} from "../db/schema";
import { decryptSecret, encryptSecret } from "../utils/crypto";
import {
  enqueueWhatsappWebCommand,
  getWhatsappWebStatusView,
} from "../services/whatsapp-web-ingestor";
import {
  invalidateProviderCache,
  testProviderConnection,
} from "../services/llm";

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

interface LlmProviderView {
  id: number;
  name: string;
  baseUrl: string | null;
  maskedKey: string;
  defaultModel: string;
  advancedModel: string;
  isActive: boolean;
  lastUsedAt: string | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SettingsSnapshot {
  apiKeys: ApiKey[];
  smtpSettings: SmtpSettings;
  users: SystemUser[];
  availableSections: SectionOption[];
  availablePeople: PersonOption[];
  llmProviders: LlmProviderView[];
}

interface WhatsappWebSettingsStatus {
  online: boolean;
  state:
    | "starting"
    | "qr_required"
    | "authenticated"
    | "ready"
    | "disconnected"
    | "auth_failure"
    | "error";
  qr?: string;
  info?: string;
  lastHeartbeatAt: string | null;
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

function toLlmProviderView(
  row: typeof llmProviders.$inferSelect,
): LlmProviderView {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.baseUrl,
    maskedKey: row.maskedKey,
    defaultModel: row.defaultModel,
    advancedModel: row.advancedModel,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    lastTestAt: row.lastTestAt?.toISOString() ?? null,
    lastTestOk: row.lastTestOk,
    lastTestError: row.lastTestError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function listLlmProviders(): Promise<LlmProviderView[]> {
  const rows = await db
    .select()
    .from(llmProviders)
    .orderBy(desc(llmProviders.isActive), desc(llmProviders.updatedAt));
  return rows.map(toLlmProviderView);
}

const LlmProviderCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  baseUrl: z.string().trim().url().nullable().optional(),
  apiKey: z.string().trim().min(10),
  defaultModel: z.string().trim().min(1),
  advancedModel: z.string().trim().min(1),
});

const LlmProviderUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  baseUrl: z.string().trim().url().nullable().optional(),
  apiKey: z.string().trim().min(10).optional(),
  defaultModel: z.string().trim().min(1).optional(),
  advancedModel: z.string().trim().min(1).optional(),
});

function maskKey(raw: string): string {
  const key = raw.trim();
  if (!key) return "****";
  if (key.length <= 8) return "****";
  return `...${key.slice(-4)}`;
}

const router = Router();

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

    const llmProvidersList = await listLlmProviders();

    const snapshot: SettingsSnapshot = {
      apiKeys: formattedApiKeys,
      smtpSettings,
      users: formattedUsers,
      availableSections,
      availablePeople,
      llmProviders: llmProvidersList,
    };

    res.json(snapshot);
  } catch (error) {
    console.error("[Settings] Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// GET /api/settings/whatsapp-web — runtime status for WhatsApp Web ingestor
router.get("/whatsapp-web", (_req, res) => {
  const status: WhatsappWebSettingsStatus = getWhatsappWebStatusView();
  res.json(status);
});

// POST /api/settings/whatsapp-web/logout — queue force re-login command
router.post("/whatsapp-web/logout", async (_req, res) => {
  try {
    const commandId = await enqueueWhatsappWebCommand("logout");
    res.status(202).json({ queued: true, commandId });
  } catch (error) {
    console.error("[Settings] Error queueing WhatsApp logout command:", error);
    res.status(500).json({ error: "Failed to queue logout command" });
  }
});

// POST /api/settings/whatsapp-web/reconnect — queue reconnect command
router.post("/whatsapp-web/reconnect", async (_req, res) => {
  try {
    const commandId = await enqueueWhatsappWebCommand("reconnect");
    res.status(202).json({ queued: true, commandId });
  } catch (error) {
    console.error("[Settings] Error queueing WhatsApp reconnect command:", error);
    res.status(500).json({ error: "Failed to queue reconnect command" });
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

// ═══════════════════════════════════════════════════════════════════════════
// LLM Providers
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/settings/llm-providers — list providers (no plaintext secrets)
router.get("/llm-providers", async (_req, res) => {
  try {
    const providers = await listLlmProviders();
    res.json({ providers });
  } catch (error) {
    console.error("[Settings] Error listing LLM providers:", error);
    res.status(500).json({ error: "Failed to list LLM providers" });
  }
});

// POST /api/settings/llm-providers — create provider
router.post("/llm-providers", async (req, res) => {
  try {
    const parsed = LlmProviderCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues.map((i) => i.message).join("; ") });
    }
    const input = parsed.data;

    const enc = encryptSecret(input.apiKey);
    const [row] = await db
      .insert(llmProviders)
      .values({
        name: input.name,
        baseUrl: input.baseUrl ?? null,
        encryptedApiKey: enc.encryptedValue,
        iv: enc.iv,
        authTag: enc.authTag,
        maskedKey: maskKey(input.apiKey),
        defaultModel: input.defaultModel,
        advancedModel: input.advancedModel,
        isActive: false,
      })
      .returning();

    invalidateProviderCache();
    res.status(201).json({ provider: toLlmProviderView(row) });
  } catch (error) {
    console.error("[Settings] Error creating LLM provider:", error);
    res.status(500).json({ error: "Failed to create LLM provider" });
  }
});

// PUT /api/settings/llm-providers/:id — update provider (apiKey optional)
router.put("/llm-providers/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid provider id" });
    }
    const parsed = LlmProviderUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues.map((i) => i.message).join("; ") });
    }
    const input = parsed.data;

    const updates: Partial<typeof llmProviders.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) updates.name = input.name;
    if (input.baseUrl !== undefined) updates.baseUrl = input.baseUrl;
    if (input.defaultModel !== undefined)
      updates.defaultModel = input.defaultModel;
    if (input.advancedModel !== undefined)
      updates.advancedModel = input.advancedModel;
    if (input.apiKey) {
      const enc = encryptSecret(input.apiKey);
      updates.encryptedApiKey = enc.encryptedValue;
      updates.iv = enc.iv;
      updates.authTag = enc.authTag;
      updates.maskedKey = maskKey(input.apiKey);
    }

    const [row] = await db
      .update(llmProviders)
      .set(updates)
      .where(eq(llmProviders.id, id))
      .returning();
    if (!row) {
      return res.status(404).json({ error: "Provider not found" });
    }
    invalidateProviderCache();
    res.json({ provider: toLlmProviderView(row) });
  } catch (error) {
    console.error("[Settings] Error updating LLM provider:", error);
    res.status(500).json({ error: "Failed to update LLM provider" });
  }
});

// DELETE /api/settings/llm-providers/:id — delete provider
router.delete("/llm-providers/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid provider id" });
    }
    const deleted = await db
      .delete(llmProviders)
      .where(eq(llmProviders.id, id))
      .returning();
    if (deleted.length === 0) {
      return res.status(404).json({ error: "Provider not found" });
    }
    invalidateProviderCache();
    res.json({ success: true });
  } catch (error) {
    console.error("[Settings] Error deleting LLM provider:", error);
    res.status(500).json({ error: "Failed to delete LLM provider" });
  }
});

// POST /api/settings/llm-providers/:id/activate — mark provider active (others inactive)
router.post("/llm-providers/:id/activate", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid provider id" });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(llmProviders)
        .set({ isActive: false, updatedAt: new Date() })
        .where(ne(llmProviders.id, id));
      await tx
        .update(llmProviders)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(llmProviders.id, id));
    });

    const [row] = await db
      .select()
      .from(llmProviders)
      .where(eq(llmProviders.id, id));
    if (!row) {
      return res.status(404).json({ error: "Provider not found" });
    }
    invalidateProviderCache();
    res.json({ provider: toLlmProviderView(row) });
  } catch (error) {
    console.error("[Settings] Error activating LLM provider:", error);
    res.status(500).json({ error: "Failed to activate LLM provider" });
  }
});

// POST /api/settings/llm-providers/:id/test — ephemeral test call
router.post("/llm-providers/:id/test", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid provider id" });
    }

    const [row] = await db
      .select()
      .from(llmProviders)
      .where(eq(llmProviders.id, id));
    if (!row) {
      return res.status(404).json({ error: "Provider not found" });
    }

    let apiKey: string;
    try {
      apiKey = decryptSecret(row.encryptedApiKey, row.iv, row.authTag);
    } catch (error) {
      return res
        .status(500)
        .json({ error: `Failed to decrypt stored key: ${String(error)}` });
    }

    const result = await testProviderConnection({
      baseUrl: row.baseUrl,
      apiKey,
      defaultModel: row.defaultModel,
    });

    await db
      .update(llmProviders)
      .set({
        lastTestAt: new Date(),
        lastTestOk: result.ok,
        lastTestError: result.ok ? null : result.error ?? "unknown error",
        updatedAt: new Date(),
      })
      .where(eq(llmProviders.id, id));

    res.json(result);
  } catch (error) {
    console.error("[Settings] Error testing LLM provider:", error);
    res.status(500).json({ error: "Failed to test LLM provider" });
  }
});

export { router as settingsRouter };
