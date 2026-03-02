import { eq, and, lt, sql, isNull } from "drizzle-orm";
import { zodResponseFormat } from "openai/helpers/zod";
import { db } from "../db";
import { tasks, risks, messages, projects } from "../db/schema";
import {
  riskDetectionSystemPrompt,
  RiskDetectionSchema,
  buildRiskDetectionPrompt,
} from "../prompts/risk-detection";
import { getQueue } from "../queue";
import { JobTypes, type DetectRisksJob } from "../queue/jobs";
import { llmChatCompletionsCreate, DEFAULT_MODEL } from "../services/llm";

export async function registerRiskEngine(): Promise<void> {
  const queue = await getQueue();

  await queue.work<DetectRisksJob>(
    JobTypes.DETECT_RISKS,
    async (jobs) => {
      for (const job of jobs) {
        try {
          const { projectId } = job.data;

        console.log(`[RiskEngine] Analyzing risks for project ${projectId}`);

        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
        });

        if (!project) {
          console.error(`[RiskEngine] Project not found: ${projectId}`);
          return;
        }

        // Layer 1: Rule-based risk detection (fast, deterministic)
        await detectRuleBasedRisks(projectId);

        // Layer 2: LLM-based risk detection (rich, qualitative)
        await detectLLMBasedRisks(projectId, project.name);

          console.log(
            `[RiskEngine] Completed risk detection for project ${projectId}`,
          );
        } catch (error) {
          console.error("[RiskEngine] Error detecting risks:", error);
          throw error;
        }
      }
    },
  );

  console.log("[RiskEngine] Worker registered");
}

/**
 * Layer 1: Rule-based risk detection
 */
async function detectRuleBasedRisks(projectId: number): Promise<void> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Deadline risks: Overdue tasks
  const overdueTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.status, "open"),
        lt(tasks.deadline, now),
      ),
    );

  if (overdueTasks.length > 0) {
    const existingRisk = await db.query.risks.findFirst({
      where: and(
        eq(risks.projectId, projectId),
        eq(risks.type, "deadline"),
        isNull(risks.resolvedAt),
      ),
    });

    if (!existingRisk) {
      await db.insert(risks).values({
        projectId,
        type: "deadline",
        severity: overdueTasks.length > 5 ? "critical" : overdueTasks.length > 2 ? "high" : "medium",
        explanation: `${overdueTasks.length} task(s) are overdue and need immediate attention.`,
        recommendation: `Review overdue tasks: ${overdueTasks.map((t) => t.description).slice(0, 3).join(", ")}${overdueTasks.length > 3 ? "..." : ""}`,
      });

      console.log(
        `[RiskEngine] Created deadline risk: ${overdueTasks.length} overdue tasks`,
      );
    }
  }

  // Stagnation risks: Tasks with no updates in 24h
  const stagnantTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.status, "open"),
        lt(tasks.updatedAt, twentyFourHoursAgo),
      ),
    );

  if (stagnantTasks.length > 3) {
    const existingRisk = await db.query.risks.findFirst({
      where: and(
        eq(risks.projectId, projectId),
        eq(risks.type, "stagnation"),
        isNull(risks.resolvedAt),
      ),
    });

    if (!existingRisk) {
      await db.insert(risks).values({
        projectId,
        type: "stagnation",
        severity: "medium",
        explanation: `${stagnantTasks.length} task(s) have not been updated in the last 24 hours.`,
        recommendation: "Check if team members need support or clarification on these tasks.",
      });

      console.log(
        `[RiskEngine] Created stagnation risk: ${stagnantTasks.length} stagnant tasks`,
      );
    }
  }
}

/**
 * Layer 2: LLM-based risk detection
 */
async function detectLLMBasedRisks(
  projectId: number,
  projectName: string,
): Promise<void> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get project statistics
  const openTasks = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, "open")));

  const overdueTasks = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.status, "open"),
        lt(tasks.deadline, now),
      ),
    );

  const stagnantTasks = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.status, "open"),
        lt(tasks.updatedAt, twentyFourHoursAgo),
      ),
    );

  const stats = {
    openTasks: Number(openTasks[0]?.count ?? 0),
    overdueTasks: Number(overdueTasks[0]?.count ?? 0),
    tasksWithNoUpdates: Number(stagnantTasks[0]?.count ?? 0),
  };

  // Get recent messages for sentiment analysis
  const recentMessages = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.projectId, projectId),
        eq(messages.processed, true),
      ),
    )
    .orderBy(messages.fonnteDate)
    .limit(50);

  if (recentMessages.length === 0) {
    console.log("[RiskEngine] No recent messages for LLM analysis");
    return;
  }

  const formattedMessages = recentMessages.map((m) => ({
    sender: m.pushName,
    text: m.messageText,
    timestamp: m.fonnteDate,
  }));

  // Call Kimi K2 for qualitative risk analysis
  const userPrompt = buildRiskDetectionPrompt(
    projectName,
    stats,
    formattedMessages,
  );

  try {
    const response = await llmChatCompletionsCreate({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: riskDetectionSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: zodResponseFormat(
        RiskDetectionSchema,
        "risk_detection",
      ),
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.warn("[RiskEngine] No content in AI response");
      return;
    }

    const result = JSON.parse(content);
    const detectedRisks = RiskDetectionSchema.parse(result);

    console.log(
      `[RiskEngine] LLM detected ${detectedRisks.risks.length} risks`,
    );

    // Insert LLM-detected risks
    for (const risk of detectedRisks.risks) {
      // Check if similar risk already exists
      const existingRisk = await db.query.risks.findFirst({
        where: and(
          eq(risks.projectId, projectId),
          eq(risks.type, risk.type),
          isNull(risks.resolvedAt),
        ),
      });

      if (!existingRisk) {
        await db.insert(risks).values({
          projectId,
          type: risk.type,
          severity: risk.severity,
          explanation: risk.explanation,
          recommendation: risk.recommendation,
        });

        console.log(
          `[RiskEngine] Created ${risk.type} risk (${risk.severity}): ${risk.explanation.slice(0, 50)}...`,
        );
      }
    }
  } catch (error) {
    console.error("[RiskEngine] Error in LLM risk detection:", error);
    // Don't throw - rule-based risks are already created
  }
}
