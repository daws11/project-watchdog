import { Router } from "express";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { connections, messages, peopleSettings, projects, risks, tasks } from "../db/schema";
import { findSimilarTasks, calculateSimilarity } from "../services/task-similarity";
import { getTaskHistory } from "../services/task-updater";
import { mergeTasks, getMergeHistory, findMergeCandidates } from "../services/task-merger";

const router = Router();

type RiskSeverity = "none" | "low" | "medium" | "high" | "critical";
type TaskPriority = "high" | "medium" | "low";
type TaskStatus = "open" | "in_progress" | "done";

function getPersonId(owner: string): string {
  return encodeURIComponent(owner.trim().toLowerCase());
}

function normalizeStatus(status: string): TaskStatus {
  if (status === "done") return "done";
  if (status === "blocked") return "in_progress";
  return "open";
}

function getPriority(deadline: Date | null, status: string, severity: RiskSeverity): TaskPriority {
  const isDone = status === "done";
  const isOverdue = Boolean(deadline && deadline.getTime() < Date.now() && !isDone);
  if (isOverdue || severity === "critical" || severity === "high") return "high";
  if (status === "blocked" || severity === "medium") return "medium";
  return "low";
}

function sourceTypeFromChannel(channelType: string): "whatsapp" | "slack" | "email" {
  if (channelType === "whatsapp") return "whatsapp";
  if (channelType === "slack") return "slack";
  return "email";
}

function getRoleLabel(owner: string | null): string {
  if (!owner) return "Team Member";
  return owner.toLowerCase().includes("lead") ? "Lead" : "Team Member";
}

router.get("/", async (req, res) => {
  try {
    const projectRiskRows = await db
      .select({
        projectId: risks.projectId,
        severity: sql<RiskSeverity>`max(case
          when ${risks.severity} = 'critical' then 'critical'
          when ${risks.severity} = 'high' then 'high'
          when ${risks.severity} = 'medium' then 'medium'
          when ${risks.severity} = 'low' then 'low'
          else 'none'
        end)`,
      })
      .from(risks)
      .groupBy(risks.projectId);
    const riskByProjectId = new Map(
      projectRiskRows.map((row) => [row.projectId, row.severity ?? "none"]),
    );

    const joinedTasks = await db
      .select({
        owner: tasks.owner,
        taskId: tasks.id,
        description: tasks.description,
        rawStatus: tasks.status,
        deadline: tasks.deadline,
        confidence: tasks.confidence,
        createdAt: tasks.createdAt,
        messageId: tasks.messageId,
        projectId: tasks.projectId,
        projectName: projects.name,
        sourceId: connections.id,
        sourceLabel: connections.label,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(messages, eq(tasks.messageId, messages.id))
      .leftJoin(connections, eq(messages.connectionId, connections.id))
      .orderBy(desc(tasks.createdAt));

    const owners = Array.from(
      new Set(joinedTasks.map((row) => row.owner).filter((v): v is string => Boolean(v))),
    );

    const settingsRows =
      owners.length > 0
        ? await db
            .select({
              personId: peopleSettings.personId,
              roleName: peopleSettings.roleName,
              name: peopleSettings.name,
            })
            .from(peopleSettings)
            .where(inArray(peopleSettings.personId, owners.map((owner) => getPersonId(owner))))
        : [];
    const settingsByPersonId = new Map(settingsRows.map((row) => [row.personId, row]));

    const formattedTasks = joinedTasks.map((row) => {
      const owner = row.owner ?? "Unknown";
      const userId = getPersonId(owner);
      const projectSeverity = riskByProjectId.get(row.projectId) ?? "none";
      const status = normalizeStatus(row.rawStatus);
      const isOverdue = Boolean(
        row.deadline && row.deadline.getTime() < Date.now() && status !== "done",
      );
      const priority = getPriority(row.deadline, row.rawStatus, projectSeverity);
      const personSettings = settingsByPersonId.get(userId);
      const userName = personSettings?.name ?? owner;
      const userRole = personSettings?.roleName ?? getRoleLabel(owner);

      return {
        id: row.taskId.toString(),
        userId,
        userName,
        userRole,
        sourceId: row.sourceId?.toString() ?? "unknown",
        sourceName: row.sourceLabel ?? "Unknown Source",
        title: row.description,
        summary: row.description,
        priority,
        status,
        dueDate: row.deadline?.toISOString() ?? null,
        confidence: row.confidence ?? 1,
        sourceReference: `${row.projectName ?? "Unknown Project"} · ${row.sourceLabel ?? "Unknown Source"}`,
        createdAt: row.createdAt.toISOString(),
        isOverdue,
      };
    });

    const people = Array.from(new Set(formattedTasks.map((task) => task.userId))).map((personId) => {
      const firstTask = formattedTasks.find((task) => task.userId === personId);
      return {
        id: personId,
        name: firstTask?.userName ?? "Unknown",
        role: firstTask?.userRole ?? "Team Member",
      };
    });

    const sources = await db
      .select({
        id: connections.id,
        name: connections.label,
        type: connections.channelType,
      })
      .from(connections);

    const formattedSources = sources.map((s) => ({
      id: s.id.toString(),
      name: s.name,
      type: sourceTypeFromChannel(s.type),
    }));

    const taskMessages = await db
      .select({
        messageId: messages.id,
        content: messages.messageText,
        sender: messages.pushName,
        senderId: messages.sender,
        timestamp: messages.createdAt,
        source: connections.label,
        taskId: tasks.id,
      })
      .from(messages)
      .leftJoin(tasks, eq(messages.id, tasks.messageId))
      .leftJoin(connections, eq(messages.connectionId, connections.id))
      .where(eq(messages.processed, true))
      .orderBy(desc(messages.createdAt))
      .limit(100);

    const formattedMessages = taskMessages.map((message) => ({
      id: message.messageId.toString(),
      taskId: message.taskId?.toString() || "",
      content: message.content,
      sender: message.sender,
      senderId: message.senderId,
      timestamp: message.timestamp.toISOString(),
      source: message.source ?? "Unknown Source",
      isOriginal: true,
      personReferences: [],
    }));

    const chatMessages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }> = [];

    const allowedPersonIds =
      req.user?.role === "regular" && req.user.assignedPeopleIds.length > 0
        ? new Set(req.user.assignedPeopleIds)
        : undefined;
    const scopedTasks = allowedPersonIds
      ? formattedTasks.filter((task) => allowedPersonIds.has(task.userId))
      : formattedTasks;
    const scopedPeople = allowedPersonIds
      ? people.filter((person) => allowedPersonIds.has(person.id))
      : people;
    const scopedTaskIds = new Set(scopedTasks.map((task) => task.id));
    const scopedMessages = formattedMessages.filter(
      (message) => message.taskId && scopedTaskIds.has(message.taskId),
    );

    res.json({
      tasks: scopedTasks,
      people: scopedPeople,
      sources: formattedSources,
      messages: scopedMessages,
      chatMessages,
    });
  } catch (error) {
    console.error("[Tasks] Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch tasks data" });
  }
});

// GET /api/tasks/by-project — grouped by project with people aggregation
router.get("/by-project", async (req, res) => {
  try {
    // Get project risk severities
    const projectRiskRows = await db
      .select({
        projectId: risks.projectId,
        severity: sql<RiskSeverity>`max(case
          when ${risks.severity} = 'critical' then 'critical'
          when ${risks.severity} = 'high' then 'high'
          when ${risks.severity} = 'medium' then 'medium'
          when ${risks.severity} = 'low' then 'low'
          else 'none'
        end)`,
      })
      .from(risks)
      .groupBy(risks.projectId);
    const riskByProjectId = new Map(
      projectRiskRows.map((row) => [row.projectId, row.severity ?? "none"]),
    );

    // Query all tasks with project and source info
    const joinedTasks = await db
      .select({
        owner: tasks.owner,
        taskId: tasks.id,
        description: tasks.description,
        rawStatus: tasks.status,
        deadline: tasks.deadline,
        confidence: tasks.confidence,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        messageId: tasks.messageId,
        projectId: tasks.projectId,
        projectName: projects.name,
        projectHealthScore: projects.healthScore,
        sourceId: connections.id,
        sourceLabel: connections.label,
        sourceChannelType: connections.channelType,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(messages, eq(tasks.messageId, messages.id))
      .leftJoin(connections, eq(messages.connectionId, connections.id))
      .orderBy(desc(tasks.createdAt));

    // Get all owners for settings lookup
    const owners = Array.from(
      new Set(joinedTasks.map((row) => row.owner).filter((v): v is string => Boolean(v))),
    );

    const settingsRows =
      owners.length > 0
        ? await db
            .select({
              personId: peopleSettings.personId,
              roleName: peopleSettings.roleName,
              name: peopleSettings.name,
            })
            .from(peopleSettings)
            .where(inArray(peopleSettings.personId, owners.map((owner) => getPersonId(owner))))
        : [];
    const settingsByPersonId = new Map(settingsRows.map((row) => [row.personId, row]));

    // Define types for formatted task
    interface FormattedTask {
      id: string;
      userId: string;
      userName: string;
      userRole: string;
      sourceId: string;
      sourceName: string;
      sourceType: "whatsapp" | "slack" | "email";
      title: string;
      summary: string;
      priority: TaskPriority;
      status: TaskStatus;
      rawStatus: string;
      dueDate: string | null;
      confidence: number;
      projectId: number;
      projectName: string;
      sourceReference: string;
      createdAt: string;
      isOverdue: boolean;
    }

    // Format tasks
    const formattedTasks: FormattedTask[] = joinedTasks.map((row) => {
      const owner = row.owner ?? "Unknown";
      const userId = getPersonId(owner);
      const projectSeverity = riskByProjectId.get(row.projectId) ?? "none";
      const status = normalizeStatus(row.rawStatus);
      const isOverdue = Boolean(
        row.deadline && row.deadline.getTime() < Date.now() && status !== "done",
      );
      const priority = getPriority(row.deadline, row.rawStatus, projectSeverity);
      const personSettings = settingsByPersonId.get(userId);
      const userName = personSettings?.name ?? owner;
      const userRole = personSettings?.roleName ?? getRoleLabel(owner);

      return {
        id: row.taskId.toString(),
        userId,
        userName,
        userRole,
        sourceId: row.sourceId?.toString() ?? "unknown",
        sourceName: row.sourceLabel ?? "Unknown Source",
        sourceType: sourceTypeFromChannel(row.sourceChannelType ?? "unknown"),
        title: row.description,
        summary: row.description,
        priority,
        status,
        rawStatus: row.rawStatus,
        dueDate: row.deadline?.toISOString() ?? null,
        confidence: row.confidence ?? 1,
        projectId: row.projectId,
        projectName: row.projectName ?? "Unknown Project",
        sourceReference: `${row.projectName ?? "Unknown Project"} · ${row.sourceLabel ?? "Unknown Source"}`,
        createdAt: row.createdAt.toISOString(),
        isOverdue,
      };
    });

    // Define types for project aggregation
    interface ProjectPerson {
      id: string;
      name: string;
      role: string;
      taskCount: number;
      openTasks: number;
    }

    interface ProjectGroup {
      id: number;
      name: string;
      healthScore: number;
      tasks: FormattedTask[];
      peopleMap: Map<string, ProjectPerson>;
      taskStats: { open: number; done: number; blocked: number; total: number };
    }

    // Group tasks by project
    const projectMap = new Map<number, ProjectGroup>();

    // Build project groups with people aggregation
    for (const task of formattedTasks) {
      const projectId = task.projectId;

      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          id: projectId,
          name: task.projectName,
          healthScore: joinedTasks.find((t) => t.projectId === projectId)?.projectHealthScore ?? 100,
          tasks: [],
          peopleMap: new Map(),
          taskStats: { open: 0, done: 0, blocked: 0, total: 0 },
        });
      }

      const projectGroup = projectMap.get(projectId)!;
      projectGroup.tasks.push(task);
      projectGroup.taskStats.total++;

      if (task.status === "done") {
        projectGroup.taskStats.done++;
      } else if (task.rawStatus === "blocked") {
        projectGroup.taskStats.blocked++;
      } else {
        projectGroup.taskStats.open++;
      }

      // Aggregate people
      if (!projectGroup.peopleMap.has(task.userId)) {
        projectGroup.peopleMap.set(task.userId, {
          id: task.userId,
          name: task.userName,
          role: task.userRole,
          taskCount: 0,
          openTasks: 0,
        });
      }

      const person = projectGroup.peopleMap.get(task.userId)!;
      person.taskCount++;
      if (task.status !== "done") {
        person.openTasks++;
      }
    }

    // Define response project type
    interface ResponseProject {
      id: number;
      name: string;
      healthScore: number;
      taskStats: { open: number; done: number; blocked: number; total: number };
      people: ProjectPerson[];
      tasks: FormattedTask[];
    }

    // Format response
    const responseProjects: ResponseProject[] = Array.from(projectMap.values()).map((projectGroup) => ({
      id: projectGroup.id,
      name: projectGroup.name,
      healthScore: projectGroup.healthScore,
      taskStats: projectGroup.taskStats,
      people: Array.from(projectGroup.peopleMap.values()).sort((a, b) => b.taskCount - a.taskCount),
      tasks: projectGroup.tasks,
    }));

    // Sort projects by total task count (descending)
    responseProjects.sort((a, b) => b.taskStats.total - a.taskStats.total);

    // Apply user permissions if needed
    const allowedPersonIds =
      req.user?.role === "regular" && req.user.assignedPeopleIds.length > 0
        ? new Set(req.user.assignedPeopleIds)
        : undefined;

    const scopedProjects = allowedPersonIds
      ? responseProjects
          .map((project) => {
            const filteredTasks = project.tasks.filter((task) => allowedPersonIds.has(task.userId));
            const filteredPeopleIds = new Set(filteredTasks.map((t) => t.userId));
            const filteredPeople = project.people.filter((p) => filteredPeopleIds.has(p.id));
            return {
              ...project,
              tasks: filteredTasks,
              people: filteredPeople,
              taskStats: {
                open: filteredTasks.filter((t) => t.status !== "done" && t.rawStatus !== "blocked").length,
                done: filteredTasks.filter((t) => t.status === "done").length,
                blocked: filteredTasks.filter((t) => t.rawStatus === "blocked").length,
                total: filteredTasks.length,
              },
            };
          })
          .filter((project) => project.tasks.length > 0)
      : responseProjects;

    // Get messages for all tasks in projects
    const allScopedTaskIds = scopedProjects.flatMap((p) => p.tasks.map((t) => parseInt(t.id)));
    const taskMessages =
      allScopedTaskIds.length > 0
        ? await db
            .select({
              messageId: messages.id,
              content: messages.messageText,
              sender: messages.pushName,
              senderId: messages.sender,
              timestamp: messages.createdAt,
              source: connections.label,
              taskId: tasks.id,
            })
            .from(messages)
            .leftJoin(tasks, eq(messages.id, tasks.messageId))
            .leftJoin(connections, eq(messages.connectionId, connections.id))
            .where(inArray(tasks.id, allScopedTaskIds))
            .orderBy(desc(messages.createdAt))
        : [];

    const formattedMessages = taskMessages.map((message) => ({
      id: message.messageId.toString(),
      taskId: message.taskId?.toString() || "",
      content: message.content,
      sender: message.sender,
      senderId: message.senderId,
      timestamp: message.timestamp.toISOString(),
      source: message.source ?? "Unknown Source",
      isOriginal: true,
      personReferences: [],
    }));

    const chatMessages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }> = [];

    res.json({
      projects: scopedProjects,
      messages: formattedMessages,
      chatMessages,
    });
  } catch (error) {
    console.error("[Tasks] Error fetching grouped data:", error);
    res.status(500).json({ error: "Failed to fetch grouped tasks data" });
  }
});

// GET /api/tasks/:id/similar - Find similar tasks
router.get("/:id/similar", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    // Get the task to find its project
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Find similar tasks
    const similarTasks = await findSimilarTasks(
      task.projectId,
      task.description,
      {
        threshold: 0.6,
        maxResults: 5,
        includeDone: false,
        includeMerged: false,
      }
    );

    // Filter out the task itself
    const filteredSimilar = similarTasks.filter(
      (result) => result.existingTask && result.existingTask.id !== taskId
    );

    // Format response
    const formattedSimilar = filteredSimilar.map((result) => ({
      task: result.existingTask,
      similarityScore: result.similarityScore,
      matchType: result.matchType,
    }));

    res.json({
      taskId,
      description: task.description,
      similarTasks: formattedSimilar,
    });
  } catch (error) {
    console.error("[Tasks] Error finding similar tasks:", error);
    res.status(500).json({ error: "Failed to find similar tasks" });
  }
});

// GET /api/tasks/:id/history - Get task evolution history
router.get("/:id/history", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    const history = await getTaskHistory(taskId);

    if (!history) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(history);
  } catch (error) {
    console.error("[Tasks] Error fetching task history:", error);
    res.status(500).json({ error: "Failed to fetch task history" });
  }
});

// GET /api/tasks/:id/merge-history - Get merge history untuk task
router.get("/:id/merge-history", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    const mergeHistory = await getMergeHistory(taskId);

    res.json(mergeHistory);
  } catch (error) {
    console.error("[Tasks] Error fetching merge history:", error);
    res.status(500).json({ error: "Failed to fetch merge history" });
  }
});

// POST /api/tasks/:id/merge - Merge tasks
router.post("/:id/merge", async (req, res) => {
  try {
    const primaryTaskId = parseInt(req.params.id);
    if (Number.isNaN(primaryTaskId)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    const { taskIdsToMerge, strategy = "smart_merge", reason } = req.body;

    if (!Array.isArray(taskIdsToMerge) || taskIdsToMerge.length === 0) {
      return res.status(400).json({ error: "taskIdsToMerge must be a non-empty array" });
    }

    const result = await mergeTasks(primaryTaskId, taskIdsToMerge, {
      mergeStrategy: strategy,
      reason,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Tasks] Error merging tasks:", error);
    res.status(500).json({
      error: "Failed to merge tasks",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/tasks/merge-candidates - Find potential merge candidates dalam project
router.get("/merge-candidates/:projectId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const threshold = parseFloat(req.query.threshold as string) || 0.75;

    const candidates = await findMergeCandidates(projectId, threshold);

    res.json({
      projectId,
      threshold,
      candidates,
    });
  } catch (error) {
    console.error("[Tasks] Error finding merge candidates:", error);
    res.status(500).json({ error: "Failed to find merge candidates" });
  }
});

export { router as tasksRouter };
