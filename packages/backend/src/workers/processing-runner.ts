import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { connections, messages, processingRules, processingRuns } from "../db/schema";
import { getQueue } from "../queue";
import {
  JobTypes,
  type ProcessBatchJob,
  type RunProcessingRuleJob,
} from "../queue/jobs";

const MAX_MESSAGES_PER_CONNECTION = 30;

export async function registerProcessingRunner(): Promise<void> {
  const queue = await getQueue();

  await queue.work<RunProcessingRuleJob>(
    JobTypes.RUN_PROCESSING_RULE,
    async (jobs) => {
      for (const job of jobs) {
        const { ruleId, runId } = job.data;

        try {
        const rule = await db.query.processingRules.findFirst({
          where: eq(processingRules.id, ruleId),
        });
        if (!rule) {
          await db
            .update(processingRuns)
            .set({
              status: "error",
              finishedAt: new Date(),
              error: `Rule ${ruleId} not found`,
            })
            .where(eq(processingRuns.id, runId));
          return;
        }

        const targetConnections = await db
          .select()
          .from(connections)
          .where(
            and(
              inArray(connections.channelType, rule.channelIds),
              eq(connections.status, "active"),
            ),
          );

        let messagesProcessed = 0;

        for (const connection of targetConnections) {
          const unprocessedMessages = await db
            .select({
              id: messages.id,
            })
            .from(messages)
            .where(
              and(
                eq(messages.connectionId, connection.id),
                eq(messages.processed, false),
              ),
            )
            .orderBy(messages.fonnteDate)
            .limit(MAX_MESSAGES_PER_CONNECTION);

          if (unprocessedMessages.length === 0) {
            continue;
          }

          const processBatchJob: ProcessBatchJob = {
            connectionId: connection.id,
            projectId: connection.projectId,
            messageIds: unprocessedMessages.map((message) => message.id),
          };

          await queue.send(JobTypes.PROCESS_BATCH, processBatchJob);
          messagesProcessed += unprocessedMessages.length;
        }

          await db
            .update(processingRuns)
            .set({
              status: "success",
              finishedAt: new Date(),
              output: {
                messagesProcessed,
                tasksExtracted: 0,
                identitiesResolved: 0,
                profilesUpdated: 0,
              },
              error: null,
            })
            .where(eq(processingRuns.id, runId));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown processing runner error";
          await db
            .update(processingRuns)
            .set({
              status: "error",
              finishedAt: new Date(),
              error: message,
            })
            .where(eq(processingRuns.id, runId));
        }
      }
    },
  );

  console.log("[ProcessingRunner] Worker registered");
}
