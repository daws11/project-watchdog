import { Router } from "express";
import { desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { connections, messages, peopleSettings, projects, risks, tasks } from "../db/schema";

const router = Router();

type RiskSeverity = "none" | "low" | "medium" | "high" | "critical";
type TaskPriority = "high" | "medium" | "low";
type TaskStatus = "open" | "in_progress" | "done";
type PersonGoalStatus = "on_goal" | "off_goal";

function getPersonId(owner: string): string {
  return encodeURIComponent(owner.trim().toLowerCase());
}

function normalizeStatus(status: string): TaskStatus {
  if (status === "done") return "done";
  if (status === "blocked") return "in_progress";
  return "open";
}

function getTaskPriority(
  deadline: Date | null,
  status: string,
  severity: RiskSeverity,
): TaskPriority {
  const isDone = status === "done";
  const isOverdue = Boolean(deadline && deadline.getTime() < Date.now() && !isDone);

  if (isOverdue || severity === "critical" || severity === "high") {
    return "high";
  }
  if (status === "blocked" || severity === "medium") {
    return "medium";
  }
  return "low";
}

function getRoleFromPriority(highPriorityCount: number): string | null {
  if (highPriorityCount >= 8) return "Tech Lead";
  if (highPriorityCount >= 3) return "Coordinator";
  return "Team Member";
}

function extractPersonReferences(text: string, owners: string[]) {
  const lowered = text.toLowerCase();
  const references = owners
    .filter((owner) => owner && lowered.includes(owner.toLowerCase()))
    .map((owner) => ({
      name: owner,
      personId: getPersonId(owner),
    }));

  return references;
}

function parseAliases(input: unknown): string[] {
  if (typeof input !== "string") return [];
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Normalize WhatsApp sender identifier to extract the actual phone number.
 * Handles various formats:
 * - 6282295559947@c.us -> 6282295559947
 * - 6282295559947 -> 6282295559947
 * - 235828466966677@lid -> null (LID format cannot be converted to phone)
 */
function normalizePhoneNumber(sender: string | null | undefined): string {
  if (!sender) return "";

  // Remove @c.us suffix (regular WhatsApp format)
  if (sender.endsWith("@c.us")) {
    return sender.replace("@c.us", "");
  }

  // Remove @s.whatsapp.net suffix (alternative format)
  if (sender.endsWith("@s.whatsapp.net")) {
    return sender.replace("@s.whatsapp.net", "");
  }

  // LID format (@lid) - privacy-enabled users, cannot extract phone number
  if (sender.endsWith("@lid")) {
    return ""; // Cannot convert LID to phone number
  }

  // Return as-is if no suffix found (assume it's already clean)
  return sender;
}

async function getProjectSeverityMap() {
  const rows = await db
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

  return new Map(rows.map((row) => [row.projectId, row.severity ?? "none"]));
}

async function getPeopleDataset(allowedPersonIds?: Set<string>) {
  const ownerRows = await db
    .select({ owner: tasks.owner })
    .from(tasks)
    .where(isNotNull(tasks.owner))
    .groupBy(tasks.owner);
  const owners = ownerRows.map((row) => row.owner).filter((v): v is string => Boolean(v));

  const projectSeverityById = await getProjectSeverityMap();
  const joinedTasks = await db
    .select({
      taskId: tasks.id,
      description: tasks.description,
      owner: tasks.owner,
      status: tasks.status,
      deadline: tasks.deadline,
      confidence: tasks.confidence,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      messageId: tasks.messageId,
      projectName: projects.name,
      projectId: tasks.projectId,
      sourceLabel: connections.label,
      senderPhone: messages.sender, // WhatsApp phone number
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(messages, eq(tasks.messageId, messages.id))
    .leftJoin(connections, eq(messages.connectionId, connections.id))
    .where(isNotNull(tasks.owner))
    .orderBy(desc(tasks.createdAt));

  const taskLookupByMessageId = new Map<number, string>();
  const formattedTasks = joinedTasks.map((row) => {
    const owner = row.owner ?? "unknown";
    const personId = getPersonId(owner);
    const severity = projectSeverityById.get(row.projectId) ?? "none";
    const priority = getTaskPriority(row.deadline, row.status, severity);
    const normalizedStatus = normalizeStatus(row.status);
    const dueDateIso = row.deadline?.toISOString() ?? null;
    const isOverdue = Boolean(
      row.deadline && row.deadline.getTime() < Date.now() && normalizedStatus !== "done",
    );
    const sourceReference = `${row.projectName ?? "Unknown Project"} · ${row.sourceLabel ?? "Unknown Source"}`;

    if (row.messageId) {
      taskLookupByMessageId.set(row.messageId, row.taskId.toString());
    }

    return {
      id: row.taskId.toString(),
      userId: personId,
      title: row.description,
      summary: row.description,
      priority,
      status: normalizedStatus,
      dueDate: dueDateIso,
      confidence: row.confidence ?? 1,
      sourceReference,
      createdAt: row.createdAt.toISOString(),
      isOverdue,
      owner,
      updatedAt: row.updatedAt,
      senderPhone: row.senderPhone, // Include phone number from WhatsApp
    };
  });

  const peopleMap = new Map<
    string,
    {
      id: string;
      name: string | null;
      phone: string;
      email: string | null;
      aliases: string[];
      role: string | null;
      function: string | null;
      identifiersLinked: number;
      taskCounts: { high: number; medium: number; low: number; overdue: number; total: number };
      lastActivityAt: string;
      status: "active" | "dormant";
      goalStatus: "on_goal" | "off_goal";
      owner: string;
    }
  >();

  for (const task of formattedTasks) {
    const existing = peopleMap.get(task.userId);
    if (!existing) {
      // Normalize phone number from the message sender (handles @c.us, @lid formats)
      const phoneNumber = normalizePhoneNumber(task.senderPhone);

      // If owner is "unknown" or empty, use phone number as the name (fallback)
      const displayName = task.owner && task.owner !== "unknown" && task.owner !== "Unknown"
        ? task.owner
        : (phoneNumber || task.owner);

      peopleMap.set(task.userId, {
        id: task.userId,
        name: displayName,
        phone: phoneNumber,
        email: null,
        aliases: phoneNumber ? [phoneNumber] : [],
        role: null,
        function: null,
        identifiersLinked: phoneNumber ? 1 : 0,
        taskCounts: { high: 0, medium: 0, low: 0, overdue: 0, total: 0 },
        lastActivityAt: task.updatedAt.toISOString(),
        status: "dormant",
        goalStatus: "on_goal",
        owner: task.owner,
      });
    }

    const person = peopleMap.get(task.userId);
    if (!person) continue;

    person.taskCounts.total += 1;
    person.taskCounts[task.priority] += 1;
    if (task.isOverdue) person.taskCounts.overdue += 1;
    if (task.status !== "done") person.status = "active";
    if (new Date(person.lastActivityAt).getTime() < task.updatedAt.getTime()) {
      person.lastActivityAt = task.updatedAt.toISOString();
    }
  }

  const people = Array.from(peopleMap.values()).map((person) => {
    const high = person.taskCounts.high;
    const overdue = person.taskCounts.overdue;
    person.role = getRoleFromPriority(high);
    person.goalStatus = overdue > 0 || high > 5 ? "off_goal" : "on_goal";
    return person;
  });

  const personIds = people.map((person) => person.id);
  const dbPeopleSettings =
    personIds.length > 0
      ? await db.select().from(peopleSettings).where(inArray(peopleSettings.personId, personIds))
      : [];
  const settingsByPersonId = new Map(dbPeopleSettings.map((item) => [item.personId, item]));

  const hydratedPeople = people.map((person) => {
    const settings = settingsByPersonId.get(person.id);
    if (!settings) {
      return person;
    }

    // Normalize phone number from settings (handles @c.us, @lid formats)
    const settingsPhone = normalizePhoneNumber(settings.phone);
    const finalPhone = settingsPhone || person.phone;

    return {
      ...person,
      name: settings.name ?? person.name,
      phone: finalPhone,
      email: settings.email ?? person.email,
      aliases: settings.aliases.length > 0 ? settings.aliases : person.aliases,
      role: settings.roleName ?? person.role,
      function: settings.roleDescription ?? person.function,
      goalStatus: (settings.priorities?.trim() ? "on_goal" : person.goalStatus) as PersonGoalStatus,
      identifiersLinked: Math.max(1, settings.aliases.length + (settings.email ? 1 : 0) + (finalPhone ? 1 : 0)),
    };
  });

  const allMessages = await db
    .select({
      id: messages.id,
      sender: messages.pushName,
      senderId: messages.sender,
      content: messages.messageText,
      timestamp: messages.createdAt,
      source: connections.label,
      rawConnectionId: messages.connectionId,
    })
    .from(messages)
    .leftJoin(connections, eq(messages.connectionId, connections.id))
    .where(eq(messages.processed, true))
    .orderBy(desc(messages.createdAt))
    .limit(150);

  const formattedMessages = allMessages.map((message) => ({
    id: message.id.toString(),
    taskId: taskLookupByMessageId.get(message.id) ?? "",
    content: message.content,
    sender: message.sender,
    senderId: message.senderId,
    timestamp: message.timestamp.toISOString(),
    source: message.source ?? `Connection #${message.rawConnectionId}`,
    isOriginal: true,
    personReferences: extractPersonReferences(
      message.content,
      people.map((person) => person.owner),
    ),
  }));

  const scopedPeople = allowedPersonIds
    ? hydratedPeople.filter((person) => allowedPersonIds.has(person.id))
    : hydratedPeople;
  const scopedPersonIds = new Set(scopedPeople.map((person) => person.id));
  const scopedTasks = formattedTasks
    .map(({ owner: _owner, updatedAt: _updatedAt, ...task }) => task)
    .filter((task) => scopedPersonIds.has(task.userId));
  const scopedTaskIds = new Set(scopedTasks.map((task) => task.id));
  const scopedMessages = formattedMessages.filter(
    (message) =>
      (message.taskId && scopedTaskIds.has(message.taskId)) ||
      message.personReferences.some((ref) => ref.personId && scopedPersonIds.has(ref.personId)),
  );

  return {
    people: scopedPeople,
    tasks: scopedTasks,
    messages: scopedMessages,
  };
}

// GET /api/people — list all people with tasks and messages
router.get("/", async (_req, res) => {
  try {
    const allowedPersonIds =
      _req.user?.role === "regular" && _req.user.assignedPeopleIds.length > 0
        ? new Set(_req.user.assignedPeopleIds)
        : undefined;
    const data = await getPeopleDataset(allowedPersonIds);
    res.json(data);
  } catch (error) {
    console.error("[People] Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch people data" });
  }
});

// GET /api/people/:id — single person with their tasks, messages, and average
router.get("/:id", async (req, res) => {
  try {
    // Person IDs in this API are canonicalized using `getPersonId()` (lowercase + URI-encoded).
    // Clients may pass either the already-encoded id (preferred) or a raw display name.
    const personId = getPersonId(decodeURIComponent(req.params.id));
    const allowedPersonIds =
      req.user?.role === "regular" && req.user.assignedPeopleIds.length > 0
        ? new Set(req.user.assignedPeopleIds)
        : undefined;
    const data = await getPeopleDataset(allowedPersonIds);
    const person = data.people.find((item) => item.id === personId);

    if (!person) {
      return res.status(404).json({ error: "Person not found" });
    }

    const personTasks = data.tasks.filter((task) => task.userId === person.id);
    const taskIds = personTasks.map((task) => task.id);
    const personMessages = data.messages.filter(
      (message) =>
        (message.taskId && taskIds.includes(message.taskId)) ||
        message.personReferences.some((ref) => ref.personId === person.id),
    );

    const averageTaskCount =
      data.people.length > 0
        ? data.people.reduce((sum, item) => sum + item.taskCounts.total, 0) / data.people.length
        : 0;

    res.json({
      person,
      tasks: personTasks,
      messages: personMessages,
      averageTaskCount,
    });
  } catch (error) {
    console.error("[People] Error fetching person data:", error);
    res.status(500).json({ error: "Failed to fetch person data" });
  }
});

// PUT /api/people/:personId/settings — update person settings
router.put("/:personId/settings", async (req, res) => {
  try {
    // Keep storage key consistent with `PersonSummary.id` (encoded canonical form).
    const personId = getPersonId(decodeURIComponent(req.params.personId));
    if (!personId) {
      return res.status(400).json({ error: "Invalid person ID" });
    }

    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : null;
    const email = typeof body.email === "string" ? body.email.trim() : null;
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const roleName = typeof body.roleName === "string" ? body.roleName.trim() : null;
    const roleDescription =
      typeof body.roleDescription === "string" ? body.roleDescription.trim() : null;
    const priorities = typeof body.priorities === "string" ? body.priorities.trim() : null;
    const customPrompt = typeof body.customPrompt === "string" ? body.customPrompt.trim() : null;
    const aliases = parseAliases(body.aliases);

    // Determine which context fields are being updated by user
    // This allows us to mark them with source='user' to prevent AI overwrite
    const setClause: Partial<typeof peopleSettings.$inferInsert> = {
      name,
      aliases,
      email,
      phone,
      roleName,
      updatedAt: new Date(),
    };

    // Only update roleDescription and mark as user-provided if user sent this field
    if (body.roleDescription !== undefined) {
      setClause.roleDescription = roleDescription;
      if (roleDescription) {
        setClause.roleDescriptionSource = "user";
      }
    }

    // Only update priorities and mark as user-provided if user sent this field
    if (body.priorities !== undefined) {
      setClause.priorities = priorities;
      if (priorities) {
        setClause.prioritiesSource = "user";
      }
    }

    // Only update customPrompt and mark as user-provided if user sent this field
    if (body.customPrompt !== undefined) {
      setClause.customPrompt = customPrompt;
      if (customPrompt) {
        setClause.customPromptSource = "user";
      }
    }

    const [saved] = await db
      .insert(peopleSettings)
      .values({
        personId,
        name,
        aliases,
        email,
        phone,
        roleName,
        roleDescription,
        roleDescriptionSource: roleDescription ? "user" : "ai",
        priorities,
        prioritiesSource: priorities ? "user" : "ai",
        customPrompt,
        customPromptSource: customPrompt ? "user" : "ai",
      })
      .onConflictDoUpdate({
        target: peopleSettings.personId,
        set: setClause,
      })
      .returning();

    res.json({
      success: true,
      settings: {
        personId: saved.personId,
        name: saved.name,
        aliases: saved.aliases.join(", "),
        email: saved.email,
        phone: saved.phone,
        roleName: saved.roleName,
        roleDescription: saved.roleDescription,
        priorities: saved.priorities,
        customPrompt: saved.customPrompt,
        contextSources: {
          roleDescription: saved.roleDescriptionSource,
          priorities: saved.prioritiesSource,
          customPrompt: saved.customPromptSource,
        },
      },
    });
  } catch (error) {
    console.error("[People] Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export { router as peopleRouter };
