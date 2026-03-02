import crypto from "node:crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { connections, messages } from "../db/schema";
import { enqueueMessage } from "../workers/message-processor";

interface FonnteWebhookPayload {
  device?: string;
  message: string;
  sender: string;
  pushname?: string;
  is_group: boolean;
  group?: string;
  date: number;
  type?: string;
}

const router = Router();
const MAX_MESSAGE_SIZE_BYTES = 4 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_MESSAGES_PER_WINDOW = 30;
const rateLimitByGroup = new Map<string, number[]>();

// Fonnte (and proxies) may send GET/HEAD to validate webhook reachability.
// We respond 200 here; the actual webhook delivery uses POST /receive.
router.get("/receive", (_req, res) => {
  res.status(200).json({ ok: true });
});

router.head("/receive", (_req, res) => {
  res.status(200).end();
});

function isGroupRateLimited(groupId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitByGroup.get(groupId) ?? [];
  const freshTimestamps = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (freshTimestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    rateLimitByGroup.set(groupId, freshTimestamps);
    return true;
  }

  freshTimestamps.push(now);
  rateLimitByGroup.set(groupId, freshTimestamps);
  return false;
}

function generateMessageHash(
  sender: string,
  group: string,
  date: number,
  message: string,
): string {
  const data = `${sender}:${group}:${date}:${message}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

router.post("/receive", async (req, res) => {
  try {
    const payload = req.body as FonnteWebhookPayload;

    // 1. Validate payload shape; return 200 to avoid webhook retries on malformed input.
    if (
      !payload ||
      typeof payload.message !== "string" ||
      typeof payload.sender !== "string" ||
      typeof payload.is_group !== "boolean" ||
      typeof payload.date !== "number"
    ) {
      return res.status(200).json({ message: "Invalid payload ignored" });
    }

    if (payload.message.length === 0) {
      return res.status(200).json({ message: "Empty message ignored" });
    }

    if (Buffer.byteLength(payload.message, "utf8") > MAX_MESSAGE_SIZE_BYTES) {
      return res.status(200).json({ message: "Message too large ignored" });
    }

    if (payload.type !== "text") {
      return res.status(200).json({ message: "Non-text message ignored" });
    }

    // 2. Only process group messages
    if (!payload.is_group || typeof payload.group !== "string") {
      return res.status(200).json({ message: "Non-group message ignored" });
    }

    if (isGroupRateLimited(payload.group)) {
      console.warn(`[Webhook] Group rate limited: ${payload.group}`);
      return res.status(200).json({ message: "Rate limited" });
    }

    // 3. Generate message hash for deduplication
    const messageHash = generateMessageHash(
      payload.sender,
      payload.group,
      payload.date,
      payload.message,
    );

    // 4. Check if message already exists
    const existingMessage = await db.query.messages.findFirst({
      where: eq(messages.messageHash, messageHash),
    });

    if (existingMessage) {
      console.log(`[Webhook] Duplicate message ignored: ${messageHash}`);
      return res.status(200).json({ message: "Duplicate message ignored" });
    }

    // 5. Lookup connection by group identifier
    const connection = await db.query.connections.findFirst({
      where: eq(connections.identifier, payload.group),
    });

    if (!connection) {
      console.warn(
        `[Webhook] No connection found for group: ${payload.group}`,
      );
      return res.status(200).json({ message: "Group not registered" });
    }

    if (connection.status !== "active") {
      console.warn(`[Webhook] Group is not active: ${payload.group}`);
      return res.status(200).json({ message: "Group is not active" });
    }

    // 6. Insert message to database.
    // Keep DB unique index as final dedupe guard for race conditions.
    let insertedMessageId: number | null = null;
    try {
      const insertResult = await db
        .insert(messages)
        .values({
          connectionId: connection.id,
          projectId: connection.projectId,
          sender: payload.sender,
          pushName: payload.pushname || "Unknown",
          messageText: payload.message,
          messageHash,
          isGroup: payload.is_group,
          fonnteDate: new Date(payload.date * 1000), // Convert Unix timestamp to Date
          processed: false,
        })
        .returning();
      insertedMessageId = insertResult[0]?.id ?? null;
    } catch (insertError) {
      const maybeDbError = insertError as { code?: string };
      if (maybeDbError.code === "23505") {
        return res.status(200).json({ message: "Duplicate message ignored" });
      }
      throw insertError;
    }

    if (!insertedMessageId) {
      return res.status(200).json({ message: "Message not inserted" });
    }

    // Update connection stats
    await db
      .update(connections)
      .set({
        lastSyncAt: new Date(),
        messagesProcessed: connection.messagesProcessed + 1,
      })
      .where(eq(connections.id, connection.id));

    console.log(
      `[Webhook] Message received and stored: ${messageHash.slice(0, 8)}... from ${payload.pushname}`,
    );

    // 7. Enqueue batch processing job (async, don't await)
    enqueueMessage(connection.id, connection.projectId, insertedMessageId).catch(
      (error) => {
        console.error("[Webhook] Failed to enqueue message:", error);
      },
    );

    // 8. Return 200 immediately (Fonnte requirement)
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error processing message:", error);
    // Still return 200 to prevent Fonnte from retrying
    return res.status(200).json({ error: "Internal error" });
  }
});

export { router as fonnteWebhookRouter };
