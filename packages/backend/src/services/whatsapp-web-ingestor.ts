import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { waIngestorCommands } from "../db/schema";

export type WhatsappWebRuntimeState =
  | "starting"
  | "qr_required"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "auth_failure"
  | "error";

export type WhatsappWebCommand = "logout" | "reconnect" | "sync_groups" | "send_message";

export interface SendMessagePayload {
  groupId: string;
  messageText: string;
}

export interface CommandRow {
  id: number;
  command: WhatsappWebCommand;
  payload?: SendMessagePayload;
}

export interface WhatsappWebRuntimeStatus {
  state: WhatsappWebRuntimeState;
  qr?: string;
  info?: string;
  updatedAtMs: number;
}

export interface WhatsappWebStatusView {
  online: boolean;
  state: WhatsappWebRuntimeState;
  qr?: string;
  info?: string;
  lastHeartbeatAt: string | null;
}

export interface AckResult {
  ok: boolean;
  error?: string;
}

const STATUS_STALE_AFTER_MS = 30_000;
const MAX_ATTEMPTS = 5;

// Exponential backoff: 1s, 2s, 4s, 8s, 16s
function getBackoffMs(attempts: number): number {
  return Math.min(Math.pow(2, attempts) * 1000, 30000); // Cap at 30s
}

let latestStatus: WhatsappWebRuntimeStatus | null = null;

function isValidCommand(command: string): command is WhatsappWebCommand {
  return (
    command === "logout" ||
    command === "reconnect" ||
    command === "sync_groups" ||
    command === "send_message"
  );
}

function isSendMessagePayload(payload: unknown): payload is SendMessagePayload {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.groupId === "string" &&
    typeof p.messageText === "string" &&
    p.groupId.length > 0 &&
    p.messageText.length > 0
  );
}

export function setWhatsappWebRuntimeStatus(status: WhatsappWebRuntimeStatus): void {
  latestStatus = status;
}

export function getWhatsappWebStatusView(nowMs = Date.now()): WhatsappWebStatusView {
  if (!latestStatus) {
    return {
      online: false,
      state: "disconnected",
      qr: undefined,
      info: undefined,
      lastHeartbeatAt: null,
    };
  }

  const online = nowMs - latestStatus.updatedAtMs <= STATUS_STALE_AFTER_MS;
  return {
    online,
    state: latestStatus.state,
    qr: latestStatus.qr,
    info: latestStatus.info,
    lastHeartbeatAt: new Date(latestStatus.updatedAtMs).toISOString(),
  };
}

export async function enqueueWhatsappWebCommand(
  command: WhatsappWebCommand,
  payload?: SendMessagePayload,
): Promise<number> {
  const values: { command: string; payload?: SendMessagePayload } = { command };
  if (payload) {
    values.payload = payload;
  }

  const inserted = await db
    .insert(waIngestorCommands)
    .values(values)
    .returning({ id: waIngestorCommands.id });

  return inserted[0]?.id ?? 0;
}

/**
 * Enqueue a send message command for a WhatsApp group.
 * The message will be delivered via the wa-ingestor process with automatic retry on failure.
 */
export async function sendMessageToGroup(
  groupId: string,
  messageText: string,
): Promise<number> {
  return enqueueWhatsappWebCommand("send_message", { groupId, messageText });
}

/**
 * Get pending commands that are available for processing.
 * Respects available_at for backoff scheduling and filters out consumed commands.
 */
export async function getPendingWhatsappWebCommands(
  limit = 20,
): Promise<CommandRow[]> {
  const now = new Date();

  const rows = await db
    .select({
      id: waIngestorCommands.id,
      command: waIngestorCommands.command,
      payload: waIngestorCommands.payload,
      attempts: waIngestorCommands.attempts,
    })
    .from(waIngestorCommands)
    .where(
      and(
        isNull(waIngestorCommands.consumedAt),
        // Either no available_at set OR available_at <= now (ready to process)
        sql`${waIngestorCommands.availableAt} is null or ${waIngestorCommands.availableAt} <= ${now}`,
      ),
    )
    .orderBy(asc(waIngestorCommands.createdAt))
    .limit(limit);

  const commands: CommandRow[] = [];
  for (const row of rows) {
    if (typeof row.command !== "string") continue;
    if (!isValidCommand(row.command)) continue;

    // Validate send_message has required payload
    if (row.command === "send_message" && !isSendMessagePayload(row.payload)) {
      console.warn(`[WA Ingestor] Skipping send_message command ${row.id}: invalid payload`);
      continue;
    }

    commands.push({
      id: row.id,
      command: row.command,
      payload: row.payload as SendMessagePayload | undefined,
    });
  }
  return commands;
}

/**
 * Acknowledge a command with success or failure.
 * On failure, increments attempts and schedules retry with exponential backoff.
 * On success (or max attempts exceeded), marks as consumed.
 */
export async function ackWhatsappWebCommand(
  id: number,
  result: AckResult,
): Promise<boolean> {
  const command = await db.query.waIngestorCommands.findFirst({
    where: eq(waIngestorCommands.id, id),
  });

  if (!command || command.consumedAt) {
    return false;
  }

  const attempts = (command.attempts ?? 0) + 1;

  // Success or max attempts exceeded -> mark consumed
  if (result.ok || attempts >= MAX_ATTEMPTS) {
    const updated = await db
      .update(waIngestorCommands)
      .set({
        consumedAt: new Date(),
        attempts,
        ...(result.ok
          ? {} // Success - clear any previous error
          : { lastError: `Max attempts exceeded. Last error: ${result.error ?? "unknown"}` }),
      })
      .where(
        and(eq(waIngestorCommands.id, id), isNull(waIngestorCommands.consumedAt)),
      )
      .returning({ id: waIngestorCommands.id });

    if (!result.ok && attempts >= MAX_ATTEMPTS) {
      console.error(
        `[WA Ingestor] Command ${id} (${command.command}) exceeded max ${MAX_ATTEMPTS} attempts. Giving up.`,
      );
    }

    return updated.length > 0;
  }

  // Failure with retries remaining -> increment attempts, schedule retry with backoff
  const backoffMs = getBackoffMs(attempts);
  const availableAt = new Date(Date.now() + backoffMs);

  const updated = await db
    .update(waIngestorCommands)
    .set({
      attempts,
      lastError: result.error ?? "Unknown error",
      availableAt,
    })
    .where(
      and(eq(waIngestorCommands.id, id), isNull(waIngestorCommands.consumedAt)),
    )
    .returning({ id: waIngestorCommands.id });

  if (updated.length > 0) {
    console.log(
      `[WA Ingestor] Command ${id} (${command.command}) failed, retry ${attempts}/${MAX_ATTEMPTS} scheduled in ${backoffMs}ms`,
    );
  }

  return updated.length > 0;
}

