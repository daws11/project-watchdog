import { eq, and, gte, sql, inArray, isNull } from "drizzle-orm";
import { zodResponseFormat } from "openai/helpers/zod";
import { db } from "../db";
import { projects, tasks, risks, reports, connections, messages } from "../db/schema";
import {
  reportGenerationSystemPrompt,
  ReportGenerationSchema,
  buildReportGenerationPrompt,
  formatReportForWhatsApp,
} from "../prompts/report-generation";
import { getQueue } from "../queue";
import { JobTypes, type GenerateReportJob } from "../queue/jobs";
import { llmChatCompletionsCreate, ADVANCED_MODEL } from "../services/llm";
import { sendMessageToGroup } from "../services/whatsapp-web-ingestor";

const REPORT_TZ = "Asia/Jakarta";

function getJakartaHHMM(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: REPORT_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getJakartaDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export async function registerReportGenerator(): Promise<void> {
  const queue = await getQueue();

  // Tick every minute and dispatch report jobs for due connections.
  await queue.schedule(
    "generate-daily-reports-tick",
    "* * * * *",
    undefined,
    { tz: REPORT_TZ },
  );

  // Worker for scheduled reports
  await queue.work(
    "generate-daily-reports-tick",
    async () => {
      try {
        const now = new Date();
        const currentHHMM = getJakartaHHMM(now);
        const reportDate = getJakartaDateString(now);

        const dueConnections = await db
          .select()
          .from(connections)
          .where(
            and(
              eq(connections.status, "active"),
              eq(connections.channelType, "whatsapp"),
              eq(connections.reportTime, currentHHMM),
            ),
          );

        if (dueConnections.length === 0) {
          return;
        }

        const projectConnectionMap = new Map<number, number[]>();
        for (const connection of dueConnections) {
          const current = projectConnectionMap.get(connection.projectId) ?? [];
          current.push(connection.id);
          projectConnectionMap.set(connection.projectId, current);
        }

        for (const [projectId, connectionIds] of projectConnectionMap) {
          const job: GenerateReportJob = {
            projectId,
            date: reportDate,
            connectionIds,
          };
          await queue.send(JobTypes.GENERATE_REPORT, job);
        }

        console.log(
          `[ReportGenerator] Enqueued ${projectConnectionMap.size} report generation jobs for ${currentHHMM}`,
        );
      } catch (error) {
        console.error("[ReportGenerator] Error scheduling reports:", error);
      }
    },
  );

  // Worker for individual report generation
  await queue.work<GenerateReportJob>(
    JobTypes.GENERATE_REPORT,
    async (jobs) => {
      for (const job of jobs) {
        try {
          const { projectId, date, connectionIds = [] } = job.data;

        console.log(
          `[ReportGenerator] Generating report for project ${projectId}, date ${date}`,
        );

        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
        });

        if (!project) {
          console.error(`[ReportGenerator] Project not found: ${projectId}`);
          return;
        }

        // Check if report already exists
        const existingReport = await db.query.reports.findFirst({
          where: and(
            eq(reports.projectId, projectId),
            eq(reports.date, date),
          ),
        });

        if (existingReport) {
          console.log(
            `[ReportGenerator] Report already exists for project ${projectId}, date ${date}`,
          );
          return;
        }

        const startOfDay = new Date(date + "T00:00:00Z");
        // Gather statistics for the day
        const newTasksCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(
            and(
              eq(tasks.projectId, projectId),
              gte(tasks.createdAt, startOfDay),
            ),
          );

        const resolvedTasksCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(
            and(
              eq(tasks.projectId, projectId),
              eq(tasks.status, "done"),
              gte(tasks.updatedAt, startOfDay),
            ),
          );

        const activeRisksCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(risks)
          .where(
            and(
              eq(risks.projectId, projectId),
              isNull(risks.resolvedAt),
            ),
          );

        const messageCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.projectId, projectId),
              gte(messages.createdAt, startOfDay),
            ),
          );

        const stats = {
          newTasks: Number(newTasksCount[0]?.count ?? 0),
          resolvedTasks: Number(resolvedTasksCount[0]?.count ?? 0),
          activeRisks: Number(activeRisksCount[0]?.count ?? 0),
          messageCount: Number(messageCount[0]?.count ?? 0),
        };

        // Gather detailed activity
        const completedTasks = await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.projectId, projectId),
              eq(tasks.status, "done"),
              gte(tasks.updatedAt, startOfDay),
            ),
          )
          .limit(10);

        const newTasks = await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.projectId, projectId),
              gte(tasks.createdAt, startOfDay),
            ),
          )
          .limit(10);

        const activeRisks = await db
          .select()
          .from(risks)
          .where(
            and(
              eq(risks.projectId, projectId),
              isNull(risks.resolvedAt),
            ),
          )
          .limit(5);

        const recentActivity = {
          completedTasks: completedTasks.map((t) => t.description),
          newTasks: newTasks.map((t) => t.description),
          risks: activeRisks.map((r) => ({
            severity: r.severity,
            explanation: r.explanation,
          })),
        };

        // Generate narrative with AI
        const userPrompt = buildReportGenerationPrompt(
          project.name,
          stats,
          recentActivity,
        );

        const response = await llmChatCompletionsCreate({
          model: ADVANCED_MODEL,
          messages: [
            { role: "system", content: reportGenerationSystemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: zodResponseFormat(
            ReportGenerationSchema,
            "report_generation",
          ),
          temperature: 0.5,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          console.warn("[ReportGenerator] No content in AI response");
          return;
        }

        const result = JSON.parse(content);
        const reportData = ReportGenerationSchema.parse(result);

        console.log(
          `[ReportGenerator] Generated narrative: ${reportData.narrative.slice(0, 100)}...`,
        );

        // Save report to database
        await db.insert(reports).values({
          projectId,
          date,
          narrative: reportData.narrative,
          newTasks: stats.newTasks,
          resolvedTasks: stats.resolvedTasks,
          activeRisks: stats.activeRisks,
        });

        console.log(
          `[ReportGenerator] Saved report to database for project ${projectId}`,
        );

        // Send report to WhatsApp groups
        const projectConnections =
          connectionIds.length > 0
            ? await db
                .select()
                .from(connections)
                .where(
                  and(
                    eq(connections.projectId, projectId),
                    eq(connections.status, "active"),
                    eq(connections.channelType, "whatsapp"),
                    inArray(connections.id, connectionIds),
                  ),
                )
            : await db
                .select()
                .from(connections)
                .where(
                  and(
                    eq(connections.projectId, projectId),
                    eq(connections.status, "active"),
                    eq(connections.channelType, "whatsapp"),
                  ),
                );

        const formattedDate = new Date(date).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const whatsappMessage = formatReportForWhatsApp(
          project.name,
          formattedDate,
          stats,
          reportData,
        );

        for (const connection of projectConnections) {
          try {
            const commandId = await sendMessageToGroup(
              connection.identifier,
              whatsappMessage,
            );
            console.log(
              `[ReportGenerator] Queued report to WhatsApp group: ${connection.label} (command ${commandId})`,
            );
          } catch (error) {
            console.error(
              `[ReportGenerator] Failed to queue report to ${connection.label}:`,
              error,
            );
          }
        }

          console.log(
            `[ReportGenerator] Completed report generation for project ${projectId}`,
          );
        } catch (error) {
          console.error("[ReportGenerator] Error generating report:", error);
          throw error;
        }
      }
    },
  );

  console.log("[ReportGenerator] Worker registered with daily cron schedule");
}
