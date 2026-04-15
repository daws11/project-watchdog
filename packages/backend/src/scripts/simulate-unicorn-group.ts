/**
 * Simulates real WhatsApp group ingestion by parsing a chat export file and
 * pumping the messages through the production pipeline:
 *   1. Create/find project "Unicorn Corp HQ"
 *   2. Create/find its WhatsApp connection
 *   3. Insert messages into `messages` (deduped by hash)
 *   4. Enqueue pg-boss PROCESS_BATCH jobs in chunks of 30 messages (same cap
 *      as message-processor.ts MAX_BATCH_SIZE)
 *
 * The script does NOT delete anything. Re-running is safe: duplicate messages
 * are skipped on unique hash, and the project/connection are reused.
 *
 * Usage (from packages/backend):
 *   npx tsx src/scripts/simulate-unicorn-group.ts
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { connections, messages, projects } from "../db/schema";
import { getQueue } from "../queue";
import { JobTypes, type ProcessBatchJob } from "../queue/jobs";

const DATASET_PATH =
  "/Users/yanuar/Documents/project-watchdog/dataset-group/Unicorn-Corp-HQ.txt";
const PROJECT_NAME = "Unicorn Corp HQ";
const CONNECTION_LABEL = "Unicorn Corp HQ WA Group";
const CONNECTION_IDENTIFIER = "unicorn-corp-hq@g.us";
const MAX_BATCH_SIZE = 30;

interface ParsedMessage {
  timestamp: Date;
  sender: string;
  text: string;
}

// Matches WhatsApp iOS export header, e.g.:
//   [3/3/26, 1:26:13 PM] Gabriel TIB: *🌞 MORNING TASK PLAN*
const HEADER_RE =
  /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)\]\s*([^:]+?):\s*(.*)$/;

function parseFile(path: string): ParsedMessage[] {
  const raw = readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/);
  const results: ParsedMessage[] = [];
  let current: ParsedMessage | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const cleaned = current.text.replace(/\s+$/, "").trim();
    if (cleaned.length === 0) {
      current = null;
      return;
    }
    current.text = cleaned;
    results.push(current);
    current = null;
  };

  for (const line of lines) {
    const header = line.match(HEADER_RE);
    if (header) {
      pushCurrent();
      const [, mStr, dStr, yStr, hStr, minStr, secStr, ampm, senderRaw, firstText] =
        header;
      const m = parseInt(mStr, 10) - 1;
      const d = parseInt(dStr, 10);
      let year = parseInt(yStr, 10);
      if (year < 100) year += 2000;
      let h = parseInt(hStr, 10);
      const min = parseInt(minStr, 10);
      const sec = parseInt(secStr, 10);
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      const date = new Date(Date.UTC(year, m, d, h, min, sec));
      // Treat as Asia/Jakarta (UTC+7). Shift so the UTC stored value
      // represents the local time correctly.
      date.setUTCHours(date.getUTCHours() - 7);

      const sender = senderRaw.replace(/^~\s*/, "").trim();
      current = {
        timestamp: date,
        sender,
        text: firstText,
      };
    } else if (current) {
      current.text += "\n" + line;
    }
  }
  pushCurrent();
  return results;
}

function computeHash(
  projectId: number,
  sender: string,
  timestamp: Date,
  text: string,
): string {
  return createHash("sha256")
    .update(`${projectId}|${sender}|${timestamp.toISOString()}|${text}`)
    .digest("hex");
}

async function ensureProject(): Promise<number> {
  const existing = await db.query.projects.findFirst({
    where: eq(projects.name, PROJECT_NAME),
  });
  if (existing) {
    console.log(`[sim] Using existing project id=${existing.id}`);
    return existing.id;
  }
  const [row] = await db
    .insert(projects)
    .values({
      name: PROJECT_NAME,
      description:
        "Simulated WhatsApp workplace group from dataset-group/Unicorn-Corp-HQ.txt. Contains morning task plans, end-of-day updates, and coordination messages from a hospitality/tech company's HQ team.",
      priorities:
        "Daily operational issues, accounting reconciliation, training platform rollout, outlet optimization, tech/AI tooling.",
      healthScore: 100,
    })
    .returning();
  console.log(`[sim] Created project id=${row.id}`);
  return row.id;
}

async function ensureConnection(projectId: number): Promise<number> {
  const existing = await db.query.connections.findFirst({
    where: and(
      eq(connections.projectId, projectId),
      eq(connections.identifier, CONNECTION_IDENTIFIER),
    ),
  });
  if (existing) {
    console.log(`[sim] Using existing connection id=${existing.id}`);
    return existing.id;
  }
  const [row] = await db
    .insert(connections)
    .values({
      projectId,
      channelType: "whatsapp",
      label: CONNECTION_LABEL,
      identifier: CONNECTION_IDENTIFIER,
      description:
        "WhatsApp group for the Unicorn Corp HQ team — operations, finance, tech, F&B, hospitality threads.",
      priorities:
        "Morning task plans, end-of-day updates, blockers, stakeholder meetings, inventory and finance issues.",
      status: "active",
      reportTime: "18:00",
    })
    .returning();
  console.log(`[sim] Created connection id=${row.id}`);
  return row.id;
}

async function insertMessages(
  projectId: number,
  connectionId: number,
  parsed: ParsedMessage[],
): Promise<number[]> {
  console.log(`[sim] Inserting ${parsed.length} messages (dedup by hash)...`);
  const rows = parsed.map((m) => ({
    connectionId,
    projectId,
    sender: m.sender,
    pushName: m.sender,
    messageText: m.text,
    messageHash: computeHash(projectId, m.sender, m.timestamp, m.text),
    isGroup: true,
    fonnteDate: m.timestamp,
    processed: false,
  }));

  // Insert in chunks to avoid oversized SQL statements.
  const insertedIds: number[] = [];
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const inserted = await db
      .insert(messages)
      .values(slice)
      .onConflictDoNothing({ target: messages.messageHash })
      .returning({ id: messages.id });
    for (const r of inserted) insertedIds.push(r.id);
  }
  console.log(
    `[sim] Inserted ${insertedIds.length} new messages (others were duplicates).`,
  );
  return insertedIds;
}

async function fetchUnprocessedMessageIds(
  projectId: number,
  connectionId: number,
): Promise<number[]> {
  const rows = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.projectId, projectId),
        eq(messages.connectionId, connectionId),
        eq(messages.processed, false),
      ),
    )
    .orderBy(messages.fonnteDate);
  return rows.map((r) => r.id);
}

async function enqueueBatches(
  projectId: number,
  connectionId: number,
  messageIds: number[],
): Promise<number> {
  const queue = await getQueue();
  let jobs = 0;
  for (let i = 0; i < messageIds.length; i += MAX_BATCH_SIZE) {
    const slice = messageIds.slice(i, i + MAX_BATCH_SIZE);
    const job: ProcessBatchJob = {
      connectionId,
      projectId,
      messageIds: slice,
    };
    await queue.send(JobTypes.PROCESS_BATCH, job);
    jobs++;
  }
  console.log(
    `[sim] Enqueued ${jobs} PROCESS_BATCH job(s) covering ${messageIds.length} messages.`,
  );
  return jobs;
}

async function main() {
  console.log(`[sim] Reading ${DATASET_PATH}`);
  const parsed = parseFile(DATASET_PATH);
  console.log(`[sim] Parsed ${parsed.length} messages from the export.`);
  if (parsed.length === 0) {
    console.warn("[sim] No messages parsed, exiting.");
    return;
  }

  const firstDate = parsed[0].timestamp;
  const lastDate = parsed[parsed.length - 1].timestamp;
  const uniqueSenders = new Set(parsed.map((m) => m.sender));
  console.log(
    `[sim] Time range: ${firstDate.toISOString()} → ${lastDate.toISOString()}, unique senders: ${uniqueSenders.size}`,
  );

  const projectId = await ensureProject();
  const connectionId = await ensureConnection(projectId);

  // Insert new rows (dedup) then compute the set of unprocessed ids for this
  // connection. Using `processed=false` means re-running the script after a
  // partial run will continue from wherever the pipeline left off, which is
  // what a "simulated real stream" looks like.
  await insertMessages(projectId, connectionId, parsed);
  const unprocessed = await fetchUnprocessedMessageIds(projectId, connectionId);
  console.log(`[sim] ${unprocessed.length} unprocessed messages ready for extraction.`);

  if (unprocessed.length === 0) {
    console.log("[sim] Nothing to enqueue — all messages already processed.");
    return;
  }

  await enqueueBatches(projectId, connectionId, unprocessed);

  // Quick status snapshot.
  const [msgCount] = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(messages)
    .where(eq(messages.projectId, projectId));
  console.log(
    `[sim] Total messages currently in DB for project ${projectId}: ${msgCount.count}`,
  );
  console.log(
    `[sim] Done. Workers will pick up the batches asynchronously via pg-boss. Watch backend logs for [TaskExtractor], [RiskEngine], [WikiUpdater].`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[sim] Failed:", error);
    process.exit(1);
  });

// Silence unused-variable warning for optional helper (kept for future use).
void inArray;
