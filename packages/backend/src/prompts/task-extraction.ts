import { z } from "zod";

export const CONFIDENCE_THRESHOLD = 0.6;

export const taskExtractionSystemPrompt = `You are an AI task extraction assistant. Analyze WhatsApp messages and extract actionable tasks into JSON format.

STRICT OUTPUT FORMAT:
You must return a JSON object with a "tasks" array. Each task MUST have these fields:
- description: Clear description of what needs to be done
- assignee: Name of assigned person from @mention, or null
- deadline: EXTRACT THE DEADLINE PHRASE from the message (e.g., "besok jam 5", "Friday EOD", "15 Maret"). NEVER leave this null if any time reference exists!
- confidence: 0.0-1.0 score based on clarity and project relevance

DEADLINE EXTRACTION RULES:
When you see these phrases, extract them as deadline:
- "deadline besok", "besok jam 5 sore" → extract "besok jam 5 sore"
- "before Friday", "by Friday EOD" → extract "before Friday EOD"  
- "tanggal 15 Maret" → extract "15 Maret"
- "Senin depan", "next Monday" → extract "Senin depan"
- "3 hari lagi", "in 3 days" → extract "3 hari lagi"
- "lusa", "day after tomorrow" → extract "lusa"

EXAMPLES:
Message: "finalisasi marketing deadline besok jam 5"
→ { "description": "Finalisasi marketing", "assignee": null, "deadline": "besok jam 5", "confidence": 0.9 }

Message: "review copy before Friday"
→ { "description": "Review copy", "assignee": null, "deadline": "before Friday", "confidence": 0.85 }

CASUAL CONVERSATION FILTER:
These are NOT tasks (low confidence or skip):
- Lunch/dinner plans (makan siang, foodcourt, kantin)
- Social hangouts
- Greetings and small talk

Messages may be in Indonesian, English, or mixed. Extract tasks in the language used.`;

export const deadlineParsingGuidelines = `
DEADLINE EXTRACTION - FEW-SHOT EXAMPLES:

Example 1:
Message: "@tim tolong finalisasi marketing materials, deadline besok jam 5 sore"
Extracted task: {
  "description": "Finalisasi marketing materials",
  "assignee": "tim",
  "deadline": "besok jam 5 sore",
  "confidence": 0.9
}

Example 2:
Message: "Review website copy harus selesai before Friday EOD ya"
Extracted task: {
  "description": "Review website copy",
  "assignee": null,
  "deadline": "before Friday EOD",
  "confidence": 0.85
}

Example 3:
Message: "Asset desain akan saya kirim Senin depan, latest by Tuesday morning"
Extracted task: {
  "description": "Kirim asset desain",
  "assignee": null,
  "deadline": "Senin depan",
  "confidence": 0.8
}

Example 4:
Message: "Feature freeze untuk launch ini tanggal 15 Maret, no exceptions"
Extracted task: {
  "description": "Feature freeze untuk launch ini",
  "assignee": null,
  "deadline": "15 Maret",
  "confidence": 0.9
}

Example 5:
Message: "Testing harus complete 3 hari sebelum launch date"
Extracted task: {
  "description": "Testing complete",
  "assignee": null,
  "deadline": "3 hari sebelum launch date",
  "confidence": 0.85
}

CRITICAL RULE: ALWAYS populate the deadline field with the EXACT phrase from the message when any time reference is mentioned.`;

const TaskSchema = z.object({
  description: z.string().describe("Clear, concise description of what needs to be done"),
  assignee: z
    .string()
    .nullable()
    .describe("Name of the person assigned using @mention, or null if not specified"),
  deadline: z
    .string()
    .describe("REQUIRED: Extract the deadline phrase from the message exactly as written. Examples: 'besok jam 5 sore', 'before Friday EOD', '15 Maret', 'Senin depan', '3 hari lagi'. If multiple deadlines mentioned, pick the most specific one. This field MUST be a string, never null when deadline is mentioned."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score 0.0-1.0 based on task clarity and project relevance"),
});

export const DeadlineExtractionSchema = z.object({
  tasks: z.array(TaskSchema),
});

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

export interface ProjectContext {
  name: string;
  description: string | null;
}

export function buildTaskExtractionPrompt(
  project: ProjectContext,
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

  const projectContextText = project.description
    ? `\n\nAbout this project: ${project.description}`
    : "";

  return `Project: ${project.name}${projectContextText}${existingTasksText}

Recent messages:
${formattedMessages}

Extract all actionable tasks from the messages above. Consider the project context when determining confidence scores.`;
}
