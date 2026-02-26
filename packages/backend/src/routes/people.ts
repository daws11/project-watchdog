import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface PersonSummary {
  id: string;
  status: string;
  taskCounts: { total: number };
  [key: string]: unknown;
}

interface TaskRecord {
  id: string;
  userId: string;
  [key: string]: unknown;
}

interface MessageRecord {
  taskId: string;
  [key: string]: unknown;
}

const samplePath = resolve(
  __dirname,
  "../../../../product-plan/sections/people/sample-data.json",
);
const sampleData = JSON.parse(readFileSync(samplePath, "utf-8"));

const people: PersonSummary[] = sampleData.people;
const tasks: TaskRecord[] = sampleData.tasks;
const messages: MessageRecord[] = sampleData.messages;

const router = Router();

// GET /api/people — list all people with tasks and messages
router.get("/", (_req, res) => {
  res.json({ people, tasks, messages });
});

// GET /api/people/:id — single person with their tasks, messages, and average
router.get("/:id", (req, res) => {
  const person = people.find((p) => p.id === req.params.id);

  if (!person) {
    res.status(404).json({ error: "Person not found" });
    return;
  }

  const personTasks = tasks.filter((t) => t.userId === req.params.id);

  const taskIds = new Set(personTasks.map((t) => t.id));

  const personMessages = messages.filter((m) => taskIds.has(m.taskId));

  // Compute average task count across active people with tasks
  const activePeopleWithTasks = people.filter(
    (p) => p.status === "active" && p.taskCounts.total > 0,
  );

  const averageTaskCount =
    activePeopleWithTasks.length > 0
      ? activePeopleWithTasks.reduce((sum, p) => sum + p.taskCounts.total, 0) /
        activePeopleWithTasks.length
      : 0;

  res.json({
    person,
    tasks: personTasks,
    messages: personMessages,
    averageTaskCount,
  });
});

// PUT /api/people/:id/settings — acknowledge settings update (no-op)
router.put("/:id/settings", (req, res) => {
  const person = people.find((p) => p.id === req.params.id);

  if (!person) {
    res.status(404).json({ error: "Person not found" });
    return;
  }

  res.json({ success: true });
});

export { router as peopleRouter };
