import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { messages } from "../db/schema";
import { getQueue } from "../queue";
import { JobTypes, type ProcessBatchJob } from "../queue/jobs";

// Batch configuration
const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const MAX_BATCH_SIZE = 30; // messages

// Track pending batches per connection
const pendingBatches = new Map<
  number,
  {
    messageIds: number[];
    timeoutId: NodeJS.Timeout;
  }
>();

export async function registerMessageProcessor(): Promise<void> {
  console.log("[MessageProcessor] Registered");
}

/**
 * Enqueue a message for batch processing
 * Implements debounced batch window: 3 min idle timeout OR 30 messages
 */
export async function enqueueMessage(
  connectionId: number,
  projectId: number,
  messageId: number,
): Promise<void> {
  const batch = pendingBatches.get(connectionId);

  if (batch) {
    // Cancel existing timeout
    clearTimeout(batch.timeoutId);

    // Add message to batch
    batch.messageIds.push(messageId);

    // Check if we hit the hard cap
    if (batch.messageIds.length >= MAX_BATCH_SIZE) {
      await flushBatch(connectionId, projectId);
      return;
    }

    // Reschedule timeout (debounce)
    batch.timeoutId = setTimeout(() => {
      flushBatch(connectionId, projectId).catch((error) => {
        console.error(
          `[MessageProcessor] Failed to flush debounced batch for connection ${connectionId}:`,
          error,
        );
      });
    }, IDLE_TIMEOUT_MS);
  } else {
    // Create new batch
    const timeoutId = setTimeout(() => {
      flushBatch(connectionId, projectId).catch((error) => {
        console.error(
          `[MessageProcessor] Failed to flush idle batch for connection ${connectionId}:`,
          error,
        );
      });
    }, IDLE_TIMEOUT_MS);

    pendingBatches.set(connectionId, {
      messageIds: [messageId],
      timeoutId,
    });
  }

  console.log(
    `[MessageProcessor] Message ${messageId} added to batch for connection ${connectionId} (${pendingBatches.get(connectionId)?.messageIds.length}/${MAX_BATCH_SIZE})`,
  );
}

/**
 * Flush the batch for a connection and create a processing job
 */
async function flushBatch(
  connectionId: number,
  projectId: number,
): Promise<void> {
  const batch = pendingBatches.get(connectionId);
  if (!batch || batch.messageIds.length === 0) {
    return;
  }

  // Clear the batch
  clearTimeout(batch.timeoutId);
  pendingBatches.delete(connectionId);

  const messageIds = [...batch.messageIds];

  console.log(
    `[MessageProcessor] Flushing batch for connection ${connectionId}: ${messageIds.length} messages`,
  );

  // Create job in pg-boss
  const queue = await getQueue();
  const job: ProcessBatchJob = {
    connectionId,
    projectId,
    messageIds,
  };

  await queue.send(JobTypes.PROCESS_BATCH, job);

  console.log(
    `[MessageProcessor] Created job ${JobTypes.PROCESS_BATCH} for connection ${connectionId}`,
  );
}
