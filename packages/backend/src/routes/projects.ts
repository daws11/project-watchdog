import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { projects, tasks } from "../db/schema";

const router = Router();

// GET /api/projects - List all projects with task stats
router.get("/", async (_req, res) => {
  try {
    // Get all projects with task counts
    const projectsWithStats = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        healthScore: projects.healthScore,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        totalTasks: sql<number>`count(${tasks.id})::int`,
        openTasks: sql<number>`count(case when ${tasks.status} = 'open' then 1 end)::int`,
        doneTasks: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
        blockedTasks: sql<number>`count(case when ${tasks.status} = 'blocked' then 1 end)::int`,
      })
      .from(projects)
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .groupBy(projects.id)
      .orderBy(projects.createdAt);

    const formattedProjects = projectsWithStats.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      healthScore: project.healthScore,
      taskStats: {
        open: project.openTasks,
        done: project.doneTasks,
        blocked: project.blockedTasks,
        total: project.totalTasks,
      },
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    }));

    res.json({ projects: formattedProjects });
  } catch (error) {
    console.error("[Projects] Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET /api/projects/:id - Get single project with tasks
router.get("/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    // Get project details
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Get tasks for this project
    const projectTasks = await db
      .select({
        id: tasks.id,
        description: tasks.description,
        owner: tasks.owner,
        status: tasks.status,
        deadline: tasks.deadline,
        confidence: tasks.confidence,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.createdAt);

    const formattedTasks = projectTasks.map((task) => ({
      id: task.id.toString(),
      title: task.description,
      assignee: task.owner,
      status: task.status,
      deadline: task.deadline?.toISOString() ?? null,
      confidence: task.confidence,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));

    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        healthScore: project.healthScore,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      tasks: formattedTasks,
    });
  } catch (error) {
    console.error("[Projects] Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// POST /api/projects - Create new project
router.post("/", async (req, res) => {
  try {
    const body = req.body as { name?: string; description?: string };

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const name = body.name.trim();
    const description = body.description?.trim() || null;

    const [newProject] = await db
      .insert(projects)
      .values({
        name,
        description,
        healthScore: 100,
      })
      .returning();

    res.status(201).json({
      project: {
        id: newProject.id,
        name: newProject.name,
        description: newProject.description,
        healthScore: newProject.healthScore,
        taskStats: { open: 0, done: 0, blocked: 0, total: 0 },
        createdAt: newProject.createdAt.toISOString(),
        updatedAt: newProject.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Projects] Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// PUT /api/projects/:id - Update project
router.put("/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const body = req.body as { name?: string; description?: string };

    // Check if project exists
    const existingProject = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Build update values
    const updateValues: { name?: string; description?: string | null } = {};
    
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return res.status(400).json({ error: "Project name cannot be empty" });
      }
      updateValues.name = body.name.trim();
    }
    
    if (body.description !== undefined) {
      updateValues.description = body.description?.trim() || null;
    }

    const [updatedProject] = await db
      .update(projects)
      .set(updateValues)
      .where(eq(projects.id, projectId))
      .returning();

    // Get updated task stats
    const taskStats = await db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(case when ${tasks.status} = 'open' then 1 end)::int`,
        done: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
        blocked: sql<number>`count(case when ${tasks.status} = 'blocked' then 1 end)::int`,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));

    res.json({
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        healthScore: updatedProject.healthScore,
        taskStats: taskStats[0] || { open: 0, done: 0, blocked: 0, total: 0 },
        createdAt: updatedProject.createdAt.toISOString(),
        updatedAt: updatedProject.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Projects] Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete("/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    // Check if project exists
    const existingProject = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Delete project (cascade will delete tasks due to FK constraint)
    await db.delete(projects).where(eq(projects.id, projectId));

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("[Projects] Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export { router as projectsRouter };
