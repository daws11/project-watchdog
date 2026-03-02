import { z } from "zod";

export const riskDetectionSystemPrompt = `You are a project risk analyst. Analyze recent project messages and task status to identify risks.

Messages may be in Indonesian or English. Pay attention to:
- Keywords indicating blockers: "macet", "blocked", "stuck", "masalah", "problem"
- Signs of delays: "belum selesai", "not done", "belum mulai", "haven't started"
- Team morale issues: frustration, confusion, lack of clarity
- Communication gaps: unclear requirements, missing information

Output valid JSON only.`;

export const RiskDetectionSchema = z.object({
  risks: z.array(
    z.object({
      type: z
        .enum(["deadline", "stagnation", "blockers", "sentiment"])
        .describe("Category of the risk"),
      severity: z
        .enum(["low", "medium", "high", "critical"])
        .describe("Severity level of the risk"),
      explanation: z
        .string()
        .describe("Clear explanation of why this is a risk"),
      recommendation: z
        .string()
        .describe("Actionable recommendation to mitigate the risk"),
    }),
  ),
});

export type RiskDetectionResult = z.infer<typeof RiskDetectionSchema>;

export function buildRiskDetectionPrompt(
  projectName: string,
  stats: {
    openTasks: number;
    overdueTasks: number;
    tasksWithNoUpdates: number;
  },
  recentMessages: Array<{ sender: string; text: string; timestamp: Date }>,
): string {
  const formattedMessages = recentMessages
    .map((m) => {
      const time = m.timestamp.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${time}] ${m.sender}: ${m.text}`;
    })
    .join("\n");

  return `Project: ${projectName}

Current Status:
- Open tasks: ${stats.openTasks}
- Overdue tasks: ${stats.overdueTasks}
- Tasks with no updates in 24h: ${stats.tasksWithNoUpdates}

Recent messages (last 24 hours):
${formattedMessages}

Identify any risks based on the task status and message content. Focus on actionable insights.`;
}
