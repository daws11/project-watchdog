import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { reports, projects } from "../db/schema";

const router = Router();

// GET /api/reports — list all reports
router.get("/", async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit as string, 10) || 50;
    const offset = Number.parseInt(req.query.offset as string, 10) || 0;

    const allReports = await db
      .select({
        report: reports,
        projectName: projects.name,
      })
      .from(reports)
      .leftJoin(projects, eq(reports.projectId, projects.id))
      .orderBy(desc(reports.date))
      .limit(limit)
      .offset(offset);

    const formattedReports = allReports.map(({ report, projectName }) => ({
      id: report.id.toString(),
      projectId: report.projectId.toString(),
      projectName: projectName || "Unknown Project",
      date: report.date,
      narrative: report.narrative,
      newTasks: report.newTasks,
      resolvedTasks: report.resolvedTasks,
      activeRisks: report.activeRisks,
      createdAt: report.createdAt.toISOString(),
    }));

    res.json({ reports: formattedReports });
  } catch (error) {
    console.error("[Reports] Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// GET /api/reports/:date — get report for specific date
router.get("/:date", async (req, res) => {
  try {
    const date = req.params.date;
    const projectId = req.query.projectId
      ? Number.parseInt(req.query.projectId as string, 10)
      : undefined;

    if (projectId && Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const whereClause = projectId
      ? and(eq(reports.date, date), eq(reports.projectId, projectId))
      : eq(reports.date, date);

    const results = await db
      .select({
        report: reports,
        projectName: projects.name,
      })
      .from(reports)
      .leftJoin(projects, eq(reports.projectId, projects.id))
      .where(whereClause);

    if (results.length === 0) {
      return res.status(404).json({ error: "No reports found for this date" });
    }

    const formattedReports = results.map(({ report, projectName }) => ({
      id: report.id.toString(),
      projectId: report.projectId.toString(),
      projectName: projectName || "Unknown Project",
      date: report.date,
      narrative: report.narrative,
      newTasks: report.newTasks,
      resolvedTasks: report.resolvedTasks,
      activeRisks: report.activeRisks,
      createdAt: report.createdAt.toISOString(),
    }));

    res.json({
      date,
      reports: formattedReports,
    });
  } catch (error) {
    console.error("[Reports] Error fetching report by date:", error);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

export { router as reportsRouter };
