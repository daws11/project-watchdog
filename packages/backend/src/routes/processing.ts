import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

type RuleAction = "extract_tasks" | "update_profiles" | "both";
type RunStatus = "success" | "partial" | "failed";

interface ProcessingRule {
  id: string;
  name: string;
  description: string;
  schedule: string;
  channelIds: string[];
  channelNames: string[];
  prompt: string;
  action: RuleAction;
  enabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: RunStatus | null;
  createdAt: string;
}

interface RunError {
  message: string;
  context: string;
}

interface ProcessingRun {
  id: string;
  ruleId: string;
  ruleName: string;
  startedAt: string;
  duration: number;
  status: RunStatus;
  messagesProcessed: number;
  tasksExtracted: number;
  identitiesResolved: number;
  profilesUpdated: number;
  errors: RunError[];
}

interface RuleFormData {
  name: string;
  description: string;
  schedule: string;
  channelIds: string[];
  prompt: string;
  action: RuleAction;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const samplePath = resolve(
  __dirname,
  "../../../../product-plan/sections/processing/sample-data.json",
);
const sampleData = JSON.parse(readFileSync(samplePath, "utf-8")) as {
  rules: ProcessingRule[];
  runs: ProcessingRun[];
};

let rules: ProcessingRule[] = [...(sampleData.rules ?? [])];
let runs: ProcessingRun[] = [...(sampleData.runs ?? [])];

const CHANNEL_NAME_BY_ID: Record<string, string> = {
  ch_whatsapp: "WhatsApp",
  ch_google_meet: "Google Meet",
  ch_email: "Email",
  ch_webhook: "Webhook",
};

function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeRuleForm(body: unknown): RuleFormData | null {
  const b = body as Partial<Record<keyof RuleFormData, unknown>>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  const schedule = typeof b.schedule === "string" ? b.schedule.trim() : "";
  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
  const action = b.action;

  const channelIdsRaw = Array.isArray(b.channelIds) ? b.channelIds : [];
  const channelIds = [...new Set(channelIdsRaw.filter((v): v is string => typeof v === "string"))]
    .map((s) => s.trim())
    .filter(Boolean);

  const isValidAction =
    action === "extract_tasks" || action === "update_profiles" || action === "both";

  if (!name || !schedule || !prompt || channelIds.length === 0 || !isValidAction) {
    return null;
  }

  for (const id of channelIds) {
    if (!CHANNEL_NAME_BY_ID[id]) return null;
  }

  return {
    name,
    description,
    schedule,
    channelIds,
    prompt,
    action: action as RuleAction,
  };
}

function pickRunStatus(): RunStatus {
  const roll = Math.random();
  if (roll < 0.7) return "success";
  if (roll < 0.9) return "partial";
  return "failed";
}

function makeRunErrors(status: RunStatus, action: RuleAction): RunError[] {
  if (status === "success") return [];

  const errorPool: RunError[] = [
    {
      message:
        "Rate limit exceeded on AI model API while processing a batch. Retry scheduled for next run.",
      context: "API call",
    },
    {
      message:
        "Failed to resolve identity for a sender — multiple candidate matches. Skipped profile update for that sender.",
      context: "Identity resolution",
    },
    {
      message:
        "Upstream source returned transient error while fetching messages. Some messages were skipped.",
      context: "Source sync",
    },
  ];

  if (action === "update_profiles" || action === "both") {
    errorPool.push({
      message:
        "Profile update batch aborted due to validation failure. Pending updates were rolled back.",
      context: "Profile update",
    });
  }

  const count = status === "partial" ? 1 : randInt(1, 2);
  const errors: RunError[] = [];
  for (let i = 0; i < count; i++) {
    errors.push(errorPool[randInt(0, errorPool.length - 1)]);
  }
  return errors;
}

function synthesizeRun(rule: ProcessingRule): ProcessingRun {
  const startedAt = new Date().toISOString();
  const status = pickRunStatus();
  const duration = randInt(12, 240);

  const messagesProcessed =
    status === "failed" ? randInt(0, 70) : randInt(20, 160);
  const identitiesResolved =
    status === "failed" ? randInt(0, 2) : randInt(0, 8);

  const tasksExtracted =
    rule.action === "extract_tasks" || rule.action === "both"
      ? status === "failed"
        ? randInt(0, 4)
        : randInt(3, 22)
      : 0;

  const profilesUpdated =
    rule.action === "update_profiles" || rule.action === "both"
      ? status === "failed"
        ? 0
        : randInt(0, 10)
      : 0;

  return {
    id: randomId("run"),
    ruleId: rule.id,
    ruleName: rule.name,
    startedAt,
    duration,
    status,
    messagesProcessed,
    tasksExtracted,
    identitiesResolved,
    profilesUpdated,
    errors: makeRunErrors(status, rule.action),
  };
}

const router = Router();

// GET /api/processing — rules + runs
router.get("/", (_req, res) => {
  res.json({ rules, runs });
});

// POST /api/processing/rules — create rule
router.post("/rules", (req, res) => {
  const form = normalizeRuleForm(req.body);
  if (!form) {
    res.status(400).json({ error: "Invalid rule payload" });
    return;
  }

  const now = new Date().toISOString();
  const rule: ProcessingRule = {
    id: randomId("rule"),
    name: form.name,
    description: form.description,
    schedule: form.schedule,
    channelIds: form.channelIds,
    channelNames: form.channelIds.map((id) => CHANNEL_NAME_BY_ID[id]),
    prompt: form.prompt,
    action: form.action,
    enabled: true,
    lastRunAt: null,
    lastRunStatus: null,
    createdAt: now,
  };

  rules = [rule, ...rules];
  res.status(201).json({ rule });
});

// PUT /api/processing/rules/:ruleId — edit rule
router.put("/rules/:ruleId", (req, res) => {
  const ruleId = req.params.ruleId;
  const existing = rules.find((r) => r.id === ruleId);
  if (!existing) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  const form = normalizeRuleForm(req.body);
  if (!form) {
    res.status(400).json({ error: "Invalid rule payload" });
    return;
  }

  const updated: ProcessingRule = {
    ...existing,
    name: form.name,
    description: form.description,
    schedule: form.schedule,
    channelIds: form.channelIds,
    channelNames: form.channelIds.map((id) => CHANNEL_NAME_BY_ID[id]),
    prompt: form.prompt,
    action: form.action,
  };

  rules = rules.map((r) => (r.id === ruleId ? updated : r));
  runs = runs.map((run) =>
    run.ruleId === ruleId ? { ...run, ruleName: updated.name } : run,
  );

  res.json({ rule: updated });
});

// DELETE /api/processing/rules/:ruleId — delete rule (and its run history)
router.delete("/rules/:ruleId", (req, res) => {
  const ruleId = req.params.ruleId;
  const before = rules.length;
  rules = rules.filter((r) => r.id !== ruleId);
  if (rules.length === before) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  runs = runs.filter((run) => run.ruleId !== ruleId);
  res.json({ success: true });
});

// POST /api/processing/rules/:ruleId/toggle — enable/disable rule
router.post("/rules/:ruleId/toggle", (req, res) => {
  const ruleId = req.params.ruleId;
  const existing = rules.find((r) => r.id === ruleId);
  if (!existing) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  const enabled = (req.body as { enabled?: unknown } | undefined)?.enabled;
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be a boolean" });
    return;
  }

  const updated: ProcessingRule = { ...existing, enabled };
  rules = rules.map((r) => (r.id === ruleId ? updated : r));
  res.json({ rule: updated });
});

// POST /api/processing/rules/:ruleId/run — trigger manual run
router.post("/rules/:ruleId/run", (req, res) => {
  const ruleId = req.params.ruleId;
  const existing = rules.find((r) => r.id === ruleId);
  if (!existing) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  const run = synthesizeRun(existing);

  const updated: ProcessingRule = {
    ...existing,
    lastRunAt: run.startedAt,
    lastRunStatus: run.status,
  };

  rules = rules.map((r) => (r.id === ruleId ? updated : r));
  runs = [run, ...runs];

  res.status(201).json({ run, rule: updated });
});

export { router as processingRouter };

