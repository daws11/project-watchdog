import { z } from "zod";

export const taskExtractionSystemPrompt = `You are an AI project assistant. Analyze WhatsApp group messages and extract actionable tasks.

Messages may be in Indonesian, English, or mixed languages. Extract tasks regardless of language.

Output valid JSON only.

Guidelines:
- Look for action items, assignments, and deadlines
- Detect assignees mentioned with @ symbol or by name
- Extract deadlines from phrases like "by Friday", "before Monday", "deadline tomorrow", etc.
- Include confidence score (0.0-1.0) based on clarity of the task
- Ignore casual conversation that doesn't contain actionable items
- When someone says "ok" or "siap" in response to a task, it's confirmation, not a new task`;

export const TaskExtractionSchema = z.object({
  tasks: z.array(
    z.object({
      description: z.string().describe("Clear description of the task"),
      assignee: z
        .string()
        .nullable()
        .describe("Name of the person assigned, or null if not specified"),
      deadline: z
        .string()
        .nullable()
        .describe(
          "Deadline in natural language or ISO date, or null if not specified",
        ),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe("Confidence score of the extraction (0.0-1.0)"),
    }),
  ),
});

export type TaskExtractionResult = z.infer<typeof TaskExtractionSchema>;

export function buildTaskExtractionPrompt(
  projectName: string,
  existingTasks: string[],
  messages: Array<{ sender: string; text: string; timestamp: Date }>,
): string {
  const formattedMessages = messages
    .map((m) => {
      const time = m.timestamp.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${time}] ${m.sender}: ${m.text}`;
    })
    .join("\n");

  const existingTasksText =
    existingTasks.length > 0
      ? `\n\nExisting open tasks:\n${existingTasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "";

  return `Project: ${projectName}${existingTasksText}

Recent messages:
${formattedMessages}

Extract all actionable tasks from the messages above.`;
}
