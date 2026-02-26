import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));

const samplePath = resolve(
  __dirname,
  "../../../../product-plan/sections/tasks/sample-data.json",
);
const sampleData = JSON.parse(readFileSync(samplePath, "utf-8"));

const tasks: unknown[] = sampleData.tasks;
const people: unknown[] = sampleData.people;
const sources: unknown[] = sampleData.sources;
const messages: unknown[] = sampleData.messages;
const chatMessages: unknown[] = sampleData.chatMessages;

const router = Router();

router.get("/", (_req, res) => {
  res.json({ tasks, people, sources, messages, chatMessages });
});

export { router as tasksRouter };
