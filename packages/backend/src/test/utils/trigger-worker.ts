import { inArray, eq } from "drizzle-orm";
import { db } from "../../db";
import { messages, tasks, projects } from "../../db/schema";
import {
  taskExtractionSystemPrompt,
  TaskExtractionSchema,
  buildTaskExtractionPrompt,
  type ProjectContext,
} from "../../prompts/task-extraction";
import { zodResponseFormat } from "openai/helpers/zod";
import { llmChatCompletionsCreate, DEFAULT_MODEL } from "../../services/llm";

export interface ProcessingResult {
  success: boolean;
  extractedTasks: Array<{
    id: number;
    description: string;
    owner: string | null;
    deadline: Date | null;
    confidence: number;
  }>;
  processingTimeMs: number;
  error?: string;
}

/**
 * Flush all pending batches and process immediately
 * Note: This is a testing utility that bypasses the queue
 */
export async function flushAllBatches(): Promise<void> {
  // In a real implementation, this would force flush all pending batches
  // For now, we rely on the batch timeout or manual processing
  console.log("[TestUtils] Batches will be flushed by normal timeout mechanism");
}

/**
 * Run task extractor synchronously for testing
 * This bypasses the queue and processes messages immediately
 */
export async function runTaskExtractorOnce(
  messageIds: number[],
): Promise<ProcessingResult> {
  const startTime = Date.now();

  try {
    console.log(
      `[TaskExtractor] Processing ${messageIds.length} messages synchronously`,
    );

    // 1. Fetch messages from database
    const messageBatch = await db
      .select()
      .from(messages)
      .where(inArray(messages.id, messageIds))
      .orderBy(messages.fonnteDate);

    if (messageBatch.length === 0) {
      return {
        success: false,
        extractedTasks: [],
        processingTimeMs: Date.now() - startTime,
        error: "No messages found",
      };
    }

    const projectId = messageBatch[0]?.projectId;
    if (!projectId) {
      return {
        success: false,
        extractedTasks: [],
        processingTimeMs: Date.now() - startTime,
        error: "Message has no project ID",
      };
    }

    // 2. Fetch project details
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return {
        success: false,
        extractedTasks: [],
        processingTimeMs: Date.now() - startTime,
        error: `Project not found: ${projectId}`,
      };
    }

    // 3. Fetch existing open tasks for context
    const existingTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .limit(10);

    const existingTaskDescriptions = existingTasks.map((t) => t.description);

    // 4. Format messages for AI
    const formattedMessages = messageBatch.map((m) => ({
      sender: m.pushName,
      text: m.messageText,
      timestamp: m.fonnteDate,
    }));

    // 5. Call Kimi K2 for task extraction
    const projectContext: ProjectContext = {
      name: project.name,
      description: project.description,
    };

    const userPrompt = buildTaskExtractionPrompt(
      projectContext,
      existingTaskDescriptions,
      formattedMessages,
    );

    console.log(`[TaskExtractor] Calling LLM for task extraction...`);

    const response = await llmChatCompletionsCreate({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: taskExtractionSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: zodResponseFormat(TaskExtractionSchema, "task_extraction"),
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        extractedTasks: [],
        processingTimeMs: Date.now() - startTime,
        error: "No content in AI response",
      };
    }

    const result = JSON.parse(content);
    const extractedTasks = TaskExtractionSchema.parse(result);

    console.log(
      `[TaskExtractor] Extracted ${extractedTasks.tasks.length} tasks`,
    );

    // 6. Insert tasks to database
    const insertedTasks: ProcessingResult["extractedTasks"] = [];

    for (const task of extractedTasks.tasks) {
      // Parse deadline if provided
      let deadline: Date | null = null;
      if (task.deadline) {
        try {
          deadline = new Date(task.deadline);
          if (Number.isNaN(deadline.getTime())) {
            deadline = null;
          }
        } catch {
          deadline = null;
        }
      }

      const insertResult = await db
        .insert(tasks)
        .values({
          projectId,
          messageId: messageBatch[0]?.id,
          description: task.description,
          owner: task.assignee,
          deadline,
          status: "open",
          confidence: task.confidence,
        })
        .returning();

      const inserted = insertResult[0];
      if (inserted) {
        insertedTasks.push({
          id: inserted.id,
          description: inserted.description,
          owner: inserted.owner,
          deadline: inserted.deadline,
          confidence: inserted.confidence ?? 0,
        });

        console.log(
          `[TaskExtractor] Created task: ${task.description.slice(0, 50)}... (confidence: ${task.confidence})`,
        );
      }
    }

    // 7. Mark messages as processed
    await db
      .update(messages)
      .set({ processed: true })
      .where(inArray(messages.id, messageIds));

    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[TaskExtractor] Completed in ${processingTimeMs}ms, created ${insertedTasks.length} tasks`,
    );

    return {
      success: true,
      extractedTasks: insertedTasks,
      processingTimeMs,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("[TaskExtractor] Error processing batch:", errorMessage);

    return {
      success: false,
      extractedTasks: [],
      processingTimeMs: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Wait for a specific duration (utility for testing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll for task extraction completion
 */
export async function pollForTasks(
  projectId: number,
  expectedCount: number,
  maxWaitMs: number = 30000,
  pollIntervalMs: number = 1000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const taskCount = await db.$count(tasks, eq(tasks.projectId, projectId));

    if (taskCount >= expectedCount) {
      return true;
    }

    await wait(pollIntervalMs);
  }

  return false;
}
