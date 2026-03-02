import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { connections, projects } from "../db/schema";
import { ingestWhatsappGroupText } from "./ingest-whatsapp-group-text";
import {
  ackWhatsappWebCommand,
  getPendingWhatsappWebCommands,
  setWhatsappWebRuntimeStatus,
} from "../services/whatsapp-web-ingestor";

const router = Router();

const payloadSchema = z.object({
  groupId: z.string().trim().min(1),
  sender: z.string().trim().min(1),
  pushName: z.string().trim().optional(),
  messageText: z.string(),
  timestampMs: z.number().int().positive(),
  messageId: z.string().trim().optional(),
});

const groupListSchema = z.object({
  groups: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        name: z.string().trim().optional(),
      }),
    )
    .default([]),
  syncedAtMs: z.number().int().positive().optional(),
});

const statusPayloadSchema = z.object({
  state: z.enum([
    "starting",
    "qr_required",
    "authenticated",
    "ready",
    "disconnected",
    "auth_failure",
    "error",
  ]),
  qr: z.string().optional(),
  info: z.string().optional(),
  updatedAtMs: z.number().int().positive(),
});

const commandAckSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const WHATSAPP_GROUP_ID_PATTERN = /@g\.us$/i;

async function getOrCreateDefaultProjectId(): Promise<number> {
  let project = await db.query.projects.findFirst();
  if (!project) {
    const [newProject] = await db
      .insert(projects)
      .values({ name: "Default Project", healthScore: 100 })
      .returning();
    project = newProject;
  }
  return project.id;
}

router.get("/", (_req, res) => {
  res.status(200).json({ ok: true });
});

router.post("/", async (req, res) => {
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const payload = parsed.data;
  const result = await ingestWhatsappGroupText({
    groupId: payload.groupId,
    sender: payload.sender,
    pushName: payload.pushName || "Unknown",
    messageText: payload.messageText,
    timestampMs: payload.timestampMs,
    messageId: payload.messageId,
    hashTimestampPart: payload.timestampMs,
  });

  if (result.outcome === "inserted") {
    return res.status(200).json({ ok: true });
  }

  if (result.outcome === "duplicate") {
    return res.status(200).json({ ok: true, ignored: "duplicate" });
  }

  if (result.reason === "Rate limited") {
    return res.status(429).json({ ok: false, ignored: "rate_limited" });
  }

  if (result.reason === "Group not registered") {
    return res.status(404).json({ ok: false, ignored: "group_not_registered" });
  }

  return res.status(200).json({ ok: true, ignored: result.reason });
});

router.post("/groups", async (req, res) => {
  const parsed = groupListSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const groups = parsed.data.groups
    .filter((g) => WHATSAPP_GROUP_ID_PATTERN.test(g.id))
    .map((g) => ({ id: g.id, name: g.name?.trim() || "" }));

  if (groups.length === 0) {
    return res.status(200).json({ ok: true, inserted: 0, updated: 0, ignored: 0 });
  }

  const defaultProjectId = await getOrCreateDefaultProjectId();

  let inserted = 0;
  let updated = 0;
  let ignored = 0;

  for (const group of groups) {
    const existing = await db.query.connections.findFirst({
      where: and(
        eq(connections.channelType, "whatsapp"),
        eq(connections.identifier, group.id),
      ),
    });

    if (!existing) {
      await db.insert(connections).values({
        projectId: defaultProjectId,
        channelType: "whatsapp",
        label: group.name || group.id,
        identifier: group.id,
        status: "active",
        lastSyncAt: new Date(),
        messagesProcessed: 0,
      });
      inserted += 1;
      continue;
    }

    await db
      .update(connections)
      .set({
        lastSyncAt: new Date(),
      })
      .where(eq(connections.id, existing.id));
    updated += 1;
  }

  return res.status(200).json({
    ok: true,
    inserted,
    updated,
    ignored,
    totalGroups: groups.length,
  });
});

router.post("/status", (req, res) => {
  const parsed = statusPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  setWhatsappWebRuntimeStatus(parsed.data);
  return res.status(200).json({ ok: true });
});

router.get("/commands", async (_req, res) => {
  const commands = await getPendingWhatsappWebCommands();
  return res.status(200).json({ commands });
});

router.post("/commands/:id/ack", async (req, res) => {
  const parsed = commandAckSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid command id" });
  }

  const acked = await ackWhatsappWebCommand(parsed.data.id);
  return res.status(200).json({ ok: true, acked });
});

export { router as whatsappWebIngestRouter };

