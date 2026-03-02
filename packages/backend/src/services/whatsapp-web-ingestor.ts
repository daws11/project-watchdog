import { and, asc, eq, isNull } from "drizzle-orm";
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

export type WhatsappWebCommand = "logout" | "reconnect" | "sync_groups";

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

interface CommandRow {
  id: number;
  command: WhatsappWebCommand;
}

const STATUS_STALE_AFTER_MS = 30_000;

let latestStatus: WhatsappWebRuntimeStatus | null = null;

function isValidCommand(command: string): command is WhatsappWebCommand {
  return (
    command === "logout" || command === "reconnect" || command === "sync_groups"
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
): Promise<number> {
  const inserted = await db
    .insert(waIngestorCommands)
    .values({ command })
    .returning({ id: waIngestorCommands.id });

  return inserted[0]?.id ?? 0;
}

export async function getPendingWhatsappWebCommands(
  limit = 20,
): Promise<CommandRow[]> {
  const rows = await db
    .select({
      id: waIngestorCommands.id,
      command: waIngestorCommands.command,
    })
    .from(waIngestorCommands)
    .where(isNull(waIngestorCommands.consumedAt))
    .orderBy(asc(waIngestorCommands.createdAt))
    .limit(limit);

  const commands: CommandRow[] = [];
  for (const row of rows) {
    if (typeof row.command !== "string") continue;
    if (!isValidCommand(row.command)) continue;
    commands.push({
      id: row.id,
      command: row.command,
    });
  }
  return commands;
}

export async function ackWhatsappWebCommand(id: number): Promise<boolean> {
  const updated = await db
    .update(waIngestorCommands)
    .set({ consumedAt: new Date() })
    .where(
      and(eq(waIngestorCommands.id, id), isNull(waIngestorCommands.consumedAt)),
    )
    .returning({ id: waIngestorCommands.id });

  return updated.length > 0;
}

