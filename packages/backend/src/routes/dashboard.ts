import { Router } from "express";
import { eq, and, lt, sql, desc, isNull } from "drizzle-orm";
import { db } from "../db";
import { tasks, risks, messages, processingRules, processingRuns } from "../db/schema";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const now = new Date();

    const openTasksCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.status, "open"));

    const overdueTasksCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, "open"),
          lt(tasks.deadline, now),
        ),
      );

    const completedTasksCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.status, "done"));

    const totalTasksCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks);

    const activeRisksCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(risks)
      .where(isNull(risks.resolvedAt));

    const criticalRisksCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(risks)
      .where(
        and(
          isNull(risks.resolvedAt),
          eq(risks.severity, "critical"),
        ),
      );

    const openTasks = Number(openTasksCount[0]?.count ?? 0);
    const overdueTasks = Number(overdueTasksCount[0]?.count ?? 0);
    const completedTasks = Number(completedTasksCount[0]?.count ?? 0);
    const activeRisks = Number(activeRisksCount[0]?.count ?? 0);
    const criticalRisks = Number(criticalRisksCount[0]?.count ?? 0);
    const totalTasks = Number(totalTasksCount[0]?.count ?? 0);

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const roundedCompletionRate = Math.round(completionRate);

    const hasCriticalRisks = criticalRisks > 0;
    const completionTrendDirection: "up" | "down" =
      roundedCompletionRate >= 70 ? "up" : "down";
    const completionColor: "sky" | "amber" =
      roundedCompletionRate >= 70 ? "sky" : "amber";

    const kpis = [
      {
        id: "open-tasks",
        label: "Open Tasks",
        value: openTasks,
        trend: "0",
        trendDirection: "neutral" as const,
        color: "default" as const,
        linkTo: "/tasks",
        linkFilter: "status=open",
      },
      {
        id: "overdue-tasks",
        label: "Overdue Tasks",
        value: overdueTasks,
        trend: "+1",
        trendDirection: "up" as const,
        color: "red" as const,
        linkTo: "/tasks",
        linkFilter: "status=overdue",
      },
      {
        id: "completed-tasks",
        label: "Completed Tasks",
        value: completedTasks,
        trend: "+5",
        trendDirection: "up" as const,
        color: "sky" as const,
        linkTo: "/tasks",
        linkFilter: "status=done",
      },
      {
        id: "active-risks",
        label: "Active Risks",
        value: activeRisks,
        trend: hasCriticalRisks ? `+${criticalRisks}` : "0",
        trendDirection: hasCriticalRisks ? "up" : "neutral",
        color: hasCriticalRisks ? "amber" : "default",
        linkTo: "/tasks",
        linkFilter: "risks=active",
      },
      {
        id: "completion-rate",
        label: "Completion Rate",
        value: roundedCompletionRate,
        trend: roundedCompletionRate >= 70 ? "+good" : "-watch",
        trendDirection: completionTrendDirection,
        color: completionColor,
        linkTo: "/tasks",
        linkFilter: "",
      },
    ];

    const onGoal = Math.floor((completionRate / 100) * 20);
    const offGoal = 20 - onGoal;

    const goalAlignment = {
      onGoal,
      offGoal,
      total: 20,
      linkTo: "/people",
      linkFilterOnGoal: "goal=on",
      linkFilterOffGoal: "goal=off",
    };

    const peopleWithTasks = await db
      .select({
        owner: tasks.owner,
        totalTasks: sql<number>`count(*)`,
        overdueTasks: sql<number>`sum(case when ${tasks.deadline} < now() and ${tasks.status} = 'open' then 1 else 0 end)`,
      })
      .from(tasks)
      .where(sql`${tasks.owner} is not null`)
      .groupBy(tasks.owner)
      .orderBy(
        desc(
          sql`sum(case when ${tasks.deadline} < now() and ${tasks.status} = 'open' then 1 else 0 end)`,
        ),
      )
      .limit(5);

    const attentionPeople = peopleWithTasks.map((p, idx) => ({
      personId: `person-${idx + 1}`,
      name: p.owner || "Unknown",
      role: "Team Member",
      goalStatus: Number(p.overdueTasks) > 0 ? ("off" as const) : ("on" as const),
      misalignedGoal: Number(p.overdueTasks) > 0 
        ? `${p.overdueTasks} overdue task(s) need attention`
        : "All tasks on track",
      taskCount: Number(p.totalTasks),
      goalMatchCount: Number(p.totalTasks) - Number(p.overdueTasks),
    }));

    const recentTasks = await db
      .select({
        id: tasks.id,
        description: tasks.description,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(10);

    const recentRisks = await db
      .select({
        id: risks.id,
        description: risks.explanation,
        severity: risks.severity,
        type: risks.type,
        createdAt: risks.createdAt,
      })
      .from(risks)
      .orderBy(desc(risks.createdAt))
      .limit(10);

    const recentMessages = await db
      .select({
        id: messages.id,
        sender: messages.pushName,
        text: messages.messageText,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.processed, true))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    const recentProcessingRuns = await db
      .select({
        id: processingRuns.id,
        status: processingRuns.status,
        startedAt: processingRuns.startedAt,
        ruleName: processingRules.name,
      })
      .from(processingRuns)
      .leftJoin(processingRules, eq(processingRuns.ruleId, processingRules.id))
      .orderBy(desc(processingRuns.startedAt))
      .limit(10);

    const activityFeed = [
      ...recentTasks.map((t) => ({
        id: `task-${t.id}`,
        type: "task" as const,
        timestamp: t.createdAt.toISOString(),
        description: `Task created: ${t.description}`,
        linkTo: "/tasks",
      })),
      ...recentRisks.map((r) => ({
        id: `risk-${r.id}`,
        type: "problem" as const,
        timestamp: r.createdAt.toISOString(),
        description: `${r.severity.toUpperCase()} risk (${r.type}): ${r.description}`,
        linkTo: "/tasks",
      })),
      ...recentMessages.map((m) => ({
        id: `message-${m.id}`,
        type: "source" as const,
        timestamp: m.createdAt.toISOString(),
        description: `${m.sender}: ${m.text.slice(0, 100)}${m.text.length > 100 ? "..." : ""}`,
        linkTo: "/sources",
      })),
      ...recentProcessingRuns.map((run) => ({
        id: `processing-${run.id}`,
        type: "processing" as const,
        timestamp: run.startedAt.toISOString(),
        description: `Rule ${run.ruleName || "Unknown"} run ${run.status}`,
        linkTo: "/processing",
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    res.json({
      kpis,
      goalAlignment,
      attentionPeople,
      activityFeed,
    });
  } catch (error) {
    console.error("[Dashboard] Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

export { router as dashboardRouter };
