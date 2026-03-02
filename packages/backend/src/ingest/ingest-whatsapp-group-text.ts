import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { connections, messages } from "../db/schema";
import { enqueueMessage } from "../workers/message-processor";

export interface IngestWhatsappGroupTextParams {
  groupId: string;
  sender: string;
  pushName?: string;
  messageText: string;
  timestampMs: number;
  /**
   * Improves dedupe for whatsapp-web.js where we have a stable message id.
   * If omitted, hashing matches the legacy Fonnte behavior.
   */
  messageId?: string;
  /**
   * Hash component used for backwards-compatible Fonnte dedupe (seconds).
   * For whatsapp-web.js you can pass timestampMs for better uniqueness.
   */
  hashTimestampPart: number;
}

export type IngestWhatsappGroupTextResult =
  | { outcome: "ignored"; reason: string }
  | { outcome: "duplicate"; reason: string }
  | { outcome: "inserted"; insertedMessageId: number; messageHash: string };

const MAX_MESSAGE_SIZE_BYTES = 4 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_MESSAGES_PER_WINDOW = 30;
const rateLimitByGroup = new Map<string, number[]>();

function isGroupRateLimited(groupId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitByGroup.get(groupId) ?? [];
  const freshTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (freshTimestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    rateLimitByGroup.set(groupId, freshTimestamps);
    return true;
  }

  freshTimestamps.push(now);
  rateLimitByGroup.set(groupId, freshTimestamps);
  return false;
}

function generateMessageHash(params: {
  sender: string;
  groupId: string;
  hashTimestampPart: number;
  messageText: string;
  messageId?: string;
}): string {
  const base = `${params.sender}:${params.groupId}:${params.hashTimestampPart}:${params.messageText}`;
  const data = params.messageId ? `${base}:${params.messageId}` : base;
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function ingestWhatsappGroupText(
  params: IngestWhatsappGroupTextParams,
): Promise<IngestWhatsappGroupTextResult> {
  if (!params.groupId || typeof params.groupId !== "string") {
    return { outcome: "ignored", reason: "Missing groupId" };
  }
  if (!params.sender || typeof params.sender !== "string") {
    return { outcome: "ignored", reason: "Missing sender" };
  }
  if (!params.messageText || typeof params.messageText !== "string") {
    return { outcome: "ignored", reason: "Missing messageText" };
  }
  if (params.messageText.length === 0) {
    return { outcome: "ignored", reason: "Empty message ignored" };
  }
  if (Buffer.byteLength(params.messageText, "utf8") > MAX_MESSAGE_SIZE_BYTES) {
    return { outcome: "ignored", reason: "Message too large ignored" };
  }
  if (!Number.isFinite(params.timestampMs) || params.timestampMs <= 0) {
    return { outcome: "ignored", reason: "Invalid timestamp ignored" };
  }
  if (isGroupRateLimited(params.groupId)) {
    return { outcome: "ignored", reason: "Rate limited" };
  }

  const messageHash = generateMessageHash({
    sender: params.sender,
    groupId: params.groupId,
    hashTimestampPart: params.hashTimestampPart,
    messageText: params.messageText,
    messageId: params.messageId,
  });

  const existingMessage = await db.query.messages.findFirst({
    where: eq(messages.messageHash, messageHash),
  });
  if (existingMessage) {
    return { outcome: "duplicate", reason: "Duplicate message ignored" };
  }

  const connection = await db.query.connections.findFirst({
    where: eq(connections.identifier, params.groupId),
  });
  if (!connection) {
    return { outcome: "ignored", reason: "Group not registered" };
  }
  if (connection.status !== "active") {
    return { outcome: "ignored", reason: "Group is not active" };
  }

  let insertedMessageId: number | null = null;
  try {
    const insertResult = await db
      .insert(messages)
      .values({
        connectionId: connection.id,
        projectId: connection.projectId,
        sender: params.sender,
        pushName: params.pushName || "Unknown",
        messageText: params.messageText,
        messageHash,
        isGroup: true,
        fonnteDate: new Date(params.timestampMs),
        processed: false,
      })
      .returning();
    insertedMessageId = insertResult[0]?.id ?? null;
  } catch (insertError) {
    const maybeDbError = insertError as { code?: string };
    if (maybeDbError.code === "23505") {
      return { outcome: "duplicate", reason: "Duplicate message ignored" };
    }
    throw insertError;
  }

  if (!insertedMessageId) {
    return { outcome: "ignored", reason: "Message not inserted" };
  }

  await db
    .update(connections)
    .set({
      lastSyncAt: new Date(),
      messagesProcessed: connection.messagesProcessed + 1,
    })
    .where(eq(connections.id, connection.id));

  enqueueMessage(connection.id, connection.projectId, insertedMessageId).catch(
    (error) => {
      console.error("[Ingest] Failed to enqueue message:", error);
    },
  );

  return {
    outcome: "inserted",
    insertedMessageId,
    messageHash,
  };
}

