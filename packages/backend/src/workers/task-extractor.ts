import { inArray, eq, and } from "drizzle-orm";
import { zodResponseFormat } from "openai/helpers/zod";
import { db } from "../db";
import { messages, tasks, projects } from "../db/schema";
import {
  taskExtractionSystemPrompt,
  TaskExtractionSchema,
  buildTaskExtractionPrompt,
} from "../prompts/task-extraction";
import { getQueue } from "../queue";
import { JobTypes, type ProcessBatchJob, type DetectRisksJob } from "../queue/jobs";
import { llmChatCompletionsCreate, DEFAULT_MODEL } from "../services/llm";

export async function registerTaskExtractor(): Promise<void> {
  const queue = await getQueue();

  await queue.work<ProcessBatchJob>(
    JobTypes.PROCESS_BATCH,
    async (jobs) => {
      for (const job of jobs) {
        try {
          const { connectionId, projectId, messageIds } = job.data;

        console.log(
          `[TaskExtractor] Processing batch: connection=${connectionId}, messages=${messageIds.length}`,
        );

        // 1. Fetch messages from database
        const messageBatch = await db
          .select()
          .from(messages)
          .where(inArray(messages.id, messageIds))
          .orderBy(messages.fonnteDate);

        if (messageBatch.length === 0) {
          console.warn(
            `[TaskExtractor] No messages found for IDs: ${messageIds.join(", ")}`,
          );
          return;
        }

        // 2. Fetch project details
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
        });

        if (!project) {
          console.error(
            `[TaskExtractor] Project not found: ${projectId}`,
          );
          return;
        }

        // 3. Fetch existing open tasks for context
        const existingTasks = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.projectId, projectId), eq(tasks.status, "open")))
          .limit(10);

        const existingTaskDescriptions = existingTasks.map((t) => t.description);

        // 4. Format messages for AI
        const formattedMessages = messageBatch.map((m) => ({
          sender: m.pushName,
          text: m.messageText,
          timestamp: m.fonnteDate,
        }));

        // 5. Call Kimi K2 for task extraction
        const userPrompt = buildTaskExtractionPrompt(
          project.name,
          existingTaskDescriptions,
          formattedMessages,
        );

        const response = await llmChatCompletionsCreate({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: taskExtractionSystemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: zodResponseFormat(
            TaskExtractionSchema,
            "task_extraction",
          ),
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          console.warn("[TaskExtractor] No content in AI response");
          return;
        }

        const result = JSON.parse(content);
        const extractedTasks = TaskExtractionSchema.parse(result);

        console.log(
          `[TaskExtractor] Extracted ${extractedTasks.tasks.length} tasks`,
        );

        // 6. Insert tasks to database
        for (const task of extractedTasks.tasks) {
          // Parse deadline if provided
          let deadline: Date | null = null;
          if (task.deadline) {
            try {
              deadline = new Date(task.deadline);
              if (Number.isNaN(deadline.getTime())) {
                deadline = null; // Invalid date
              }
            } catch {
              deadline = null;
            }
          }

          await db.insert(tasks).values({
            projectId,
            messageId: messageBatch[0]?.id, // Link to first message in batch
            description: task.description,
            owner: task.assignee,
            deadline,
            status: "open",
            confidence: task.confidence,
          });

          console.log(
            `[TaskExtractor] Created task: ${task.description.slice(0, 50)}... (confidence: ${task.confidence})`,
          );
        }

        // 7. Mark messages as processed
        await db
          .update(messages)
          .set({ processed: true })
          .where(inArray(messages.id, messageIds));

        // 8. Enqueue risk detection job
        const riskJob: DetectRisksJob = { projectId };
        await queue.send(JobTypes.DETECT_RISKS, riskJob);

          console.log(
            `[TaskExtractor] Completed batch processing, enqueued risk detection`,
          );
        } catch (error) {
          console.error("[TaskExtractor] Error processing batch:", error);
          throw error; // Will trigger retry
        }
      }
    },
  );

  console.log("[TaskExtractor] Worker registered");
}
