import { Router } from "express";
import { desc, sql } from "drizzle-orm";
import { db } from "../db";
import { messages, processingRuns } from "../db/schema";
import { getQueue } from "../queue";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const startTime = process.hrtime();

    // Check database connection
    let dbStatus: "connected" | "disconnected" = "disconnected";
    let dbLatency = 0;

    try {
      const dbStart = process.hrtime();
      await db.execute(sql`SELECT 1`);
      const dbEnd = process.hrtime(dbStart);
      dbLatency = Math.floor((dbEnd[0] * 1000 + dbEnd[1] / 1000000));
      dbStatus = "connected";
    } catch (error) {
      console.error("[Health] Database check failed:", error);
    }

    // Check queue
    let queueDepth = 0;
    let failedJobs = 0;

    try {
      const queue = await getQueue();
      // pg-boss doesn't expose queue depth directly, so we check job counts
      // This is a simplified check
      queueDepth = 0; // Would need custom query to pg-boss's job table
    } catch (error) {
      console.error("[Health] Queue check failed:", error);
    }

    // Get last webhook received
    let lastWebhookAt: string | null = null;
    let totalMessagesProcessed = 0;

    try {
      const lastMessage = await db
        .select()
        .from(messages)
        .orderBy(desc(messages.createdAt))
        .limit(1);

      if (lastMessage.length > 0) {
        lastWebhookAt = lastMessage[0].createdAt.toISOString();
      }

      const messageCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages);

      totalMessagesProcessed = Number(messageCount[0]?.count ?? 0);
    } catch (error) {
      console.error("[Health] Webhook check failed:", error);
    }

    // Get last AI job status
    let lastAiJobStatus: "success" | "error" | "running" | null = null;
    let lastAiJobCompletedAt: string | null = null;

    try {
      const lastRun = await db
        .select()
        .from(processingRuns)
        .orderBy(desc(processingRuns.startedAt))
        .limit(1);

      if (lastRun.length > 0) {
        lastAiJobStatus = lastRun[0].status as "success" | "error" | "running";
        lastAiJobCompletedAt = lastRun[0].finishedAt?.toISOString() || null;
      }
    } catch (error) {
      console.error("[Health] AI job check failed:", error);
    }

    const endTime = process.hrtime(startTime);
    const healthCheckDuration = Math.floor((endTime[0] * 1000 + endTime[1] / 1000000));

    // Determine overall status
    let status: "healthy" | "degraded" | "error" = "healthy";
    let message = "All systems operational";

    if (dbStatus === "disconnected") {
      status = "error";
      message = "Database connection failed";
    } else if (dbLatency > 1000) {
      status = "degraded";
      message = "Database experiencing high latency";
    } else if (lastAiJobStatus === "error") {
      status = "degraded";
      message = "Recent AI job failed";
    }

    res.json({
      status,
      message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      healthCheckDuration,
      database: {
        status: dbStatus,
        latency: dbLatency,
      },
      queue: {
        depth: queueDepth,
        failedJobs,
      },
      webhook: {
        lastReceivedAt: lastWebhookAt,
        messagesProcessed: totalMessagesProcessed,
      },
      ai: {
        lastJobStatus: lastAiJobStatus,
        lastJobCompletedAt: lastAiJobCompletedAt,
      },
    });
  } catch (error) {
    console.error("[Health] Health check error:", error);
    res.status(500).json({
      status: "error",
      message: "Health check failed",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
});

export { router as healthRouter };
