import { Router } from "express";
import { checkDatabaseHealth } from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  res.json({
    status: dbHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealthy ? "connected" : "disconnected",
    message: "Project Watchdog backend is running",
  });
});

export { router as healthRouter };
