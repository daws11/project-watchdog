import { Router } from "express";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { connections, messages, peopleSettings, projects, risks, tasks } from "../db/schema";

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

export { router as tasksRouter };
