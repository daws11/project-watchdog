import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { processingRules, processingRuns } from "../db/schema";
import { getQueue } from "../queue";
import { JobTypes, type RunProcessingRuleJob } from "../queue/jobs";

type RuleAction = "extract_tasks" | "update_profiles" | "both";
type RunStatus = "running" | "success" | "error";

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
  errors: Array<{ message: string; context: string }>;
}

interface RuleFormData {
  name: string;
  description: string;
  schedule: string;
  channelIds: string[];
  prompt: string;
  action: RuleAction;
}

const CHANNEL_NAME_BY_ID: Record<string, string> = {
  whatsapp: "WhatsApp",
  google_meet: "Google Meet",
  email: "Email",
  webhook: "Webhook",
};

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

  return {
    name,
    description,
    schedule,
    channelIds,
    prompt,
    action: action as RuleAction,
  };
}

const router = Router();

// GET /api/processing — rules + runs
router.get("/", async (_req, res) => {
  try {
    const dbRules = await db
      .select()
      .from(processingRules)
      .orderBy(desc(processingRules.createdAt));
    const dbRuns = await db
      .select()
      .from(processingRuns)
      .orderBy(desc(processingRuns.startedAt));

    // Get last run info for each rule
    const ruleRunMap = new Map<
      number,
      { lastRunAt: string | null; lastRunStatus: RunStatus | null }
    >();

    for (const run of dbRuns) {
      if (!ruleRunMap.has(run.ruleId)) {
        ruleRunMap.set(run.ruleId, {
          lastRunAt: run.startedAt.toISOString(),
          lastRunStatus: run.status as RunStatus,
        });
      }
    }

    const rules: ProcessingRule[] = dbRules.map((r) => {
      const lastRun = ruleRunMap.get(r.id);
      return {
        id: r.id.toString(),
        name: r.name,
        description: r.description,
        schedule: r.schedule,
        channelIds: r.channelIds,
        channelNames: r.channelIds.map((id) => CHANNEL_NAME_BY_ID[id] || id),
        prompt: r.prompt,
        action: r.action as RuleAction,
        enabled: r.enabled,
        lastRunAt: lastRun?.lastRunAt || null,
        lastRunStatus: lastRun?.lastRunStatus || null,
        createdAt: r.createdAt.toISOString(),
      };
    });

    const runs: ProcessingRun[] = await Promise.all(
      dbRuns.map(async (run) => {
        const rule = dbRules.find((r) => r.id === run.ruleId);
        const duration = run.finishedAt
          ? Math.floor((run.finishedAt.getTime() - run.startedAt.getTime()) / 1000)
          : 0;

        const output = run.output as Record<string, number> | null;

        return {
          id: run.id.toString(),
          ruleId: run.ruleId.toString(),
          ruleName: rule?.name || "Unknown Rule",
          startedAt: run.startedAt.toISOString(),
          duration,
          status: run.status as RunStatus,
          messagesProcessed: output?.messagesProcessed || 0,
          tasksExtracted: output?.tasksExtracted || 0,
          identitiesResolved: output?.identitiesResolved || 0,
          profilesUpdated: output?.profilesUpdated || 0,
          errors: run.error ? [{ message: run.error, context: "Execution" }] : [],
        };
      }),
    );

    res.json({ rules, runs });
  } catch (error) {
    console.error("[Processing] Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch processing data" });
  }
});

// POST /api/processing/rules — create rule
router.post("/rules", async (req, res) => {
  try {
    const form = normalizeRuleForm(req.body);
    if (!form) {
      return res.status(400).json({ error: "Invalid rule payload" });
    }

    const [newRule] = await db
      .insert(processingRules)
      .values({
        name: form.name,
        description: form.description,
        schedule: form.schedule,
        channelIds: form.channelIds,
        prompt: form.prompt,
        action: form.action,
        enabled: true,
      })
      .returning();

    const rule: ProcessingRule = {
      id: newRule.id.toString(),
      name: newRule.name,
      description: newRule.description,
      schedule: newRule.schedule,
      channelIds: newRule.channelIds,
      channelNames: newRule.channelIds.map((id) => CHANNEL_NAME_BY_ID[id] || id),
      prompt: newRule.prompt,
      action: newRule.action as RuleAction,
      enabled: newRule.enabled,
      lastRunAt: null,
      lastRunStatus: null,
      createdAt: newRule.createdAt.toISOString(),
    };

    res.status(201).json({ rule });
  } catch (error) {
    console.error("[Processing] Error creating rule:", error);
    res.status(500).json({ error: "Failed to create rule" });
  }
});

// PUT /api/processing/rules/:ruleId — edit rule
router.put("/rules/:ruleId", async (req, res) => {
  try {
    const ruleId = Number.parseInt(req.params.ruleId, 10);
    if (Number.isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }

    const form = normalizeRuleForm(req.body);
    if (!form) {
      return res.status(400).json({ error: "Invalid rule payload" });
    }

    const [updated] = await db
      .update(processingRules)
      .set({
        name: form.name,
        description: form.description,
        schedule: form.schedule,
        channelIds: form.channelIds,
        prompt: form.prompt,
        action: form.action,
      })
      .where(eq(processingRules.id, ruleId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Rule not found" });
    }

    const rule: ProcessingRule = {
      id: updated.id.toString(),
      name: updated.name,
      description: updated.description,
      schedule: updated.schedule,
      channelIds: updated.channelIds,
      channelNames: updated.channelIds.map((id) => CHANNEL_NAME_BY_ID[id] || id),
      prompt: updated.prompt,
      action: updated.action as RuleAction,
      enabled: updated.enabled,
      lastRunAt: null,
      lastRunStatus: null,
      createdAt: updated.createdAt.toISOString(),
    };

    res.json({ rule });
  } catch (error) {
    console.error("[Processing] Error updating rule:", error);
    res.status(500).json({ error: "Failed to update rule" });
  }
});

// DELETE /api/processing/rules/:ruleId — delete rule (and its run history)
router.delete("/rules/:ruleId", async (req, res) => {
  try {
    const ruleId = Number.parseInt(req.params.ruleId, 10);
    if (Number.isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }

    const deleted = await db
      .delete(processingRules)
      .where(eq(processingRules.id, ruleId))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Rule not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Processing] Error deleting rule:", error);
    res.status(500).json({ error: "Failed to delete rule" });
  }
});

// POST /api/processing/rules/:ruleId/toggle — enable/disable rule
router.post("/rules/:ruleId/toggle", async (req, res) => {
  try {
    const ruleId = Number.parseInt(req.params.ruleId, 10);
    if (Number.isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }

    const enabled = (req.body as { enabled?: unknown } | undefined)?.enabled;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "enabled must be a boolean" });
    }

    const [updated] = await db
      .update(processingRules)
      .set({ enabled })
      .where(eq(processingRules.id, ruleId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Rule not found" });
    }

    const rule: ProcessingRule = {
      id: updated.id.toString(),
      name: updated.name,
      description: updated.description,
      schedule: updated.schedule,
      channelIds: updated.channelIds,
      channelNames: updated.channelIds.map((id) => CHANNEL_NAME_BY_ID[id] || id),
      prompt: updated.prompt,
      action: updated.action as RuleAction,
      enabled: updated.enabled,
      lastRunAt: null,
      lastRunStatus: null,
      createdAt: updated.createdAt.toISOString(),
    };

    res.json({ rule });
  } catch (error) {
    console.error("[Processing] Error toggling rule:", error);
    res.status(500).json({ error: "Failed to toggle rule" });
  }
});

// POST /api/processing/rules/:ruleId/run — trigger manual run
router.post("/rules/:ruleId/run", async (req, res) => {
  try {
    const ruleId = Number.parseInt(req.params.ruleId, 10);
    if (Number.isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }

    const rule = await db.query.processingRules.findFirst({
      where: eq(processingRules.id, ruleId),
    });

    if (!rule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    // Create a processing run record
    const [newRun] = await db
      .insert(processingRuns)
      .values({
        ruleId: rule.id,
        status: "running",
      })
      .returning();

    const queue = await getQueue();
    const runJob: RunProcessingRuleJob = {
      ruleId: rule.id,
      runId: newRun.id,
    };
    await queue.send(JobTypes.RUN_PROCESSING_RULE, runJob);

    const run: ProcessingRun = {
      id: newRun.id.toString(),
      ruleId: newRun.ruleId.toString(),
      ruleName: rule.name,
      startedAt: newRun.startedAt.toISOString(),
      duration: 0,
      status: newRun.status as RunStatus,
      messagesProcessed: 0,
      tasksExtracted: 0,
      identitiesResolved: 0,
      profilesUpdated: 0,
      errors: [],
    };

    const ruleResponse: ProcessingRule = {
      id: rule.id.toString(),
      name: rule.name,
      description: rule.description,
      schedule: rule.schedule,
      channelIds: rule.channelIds,
      channelNames: rule.channelIds.map((id) => CHANNEL_NAME_BY_ID[id] || id),
      prompt: rule.prompt,
      action: rule.action as RuleAction,
      enabled: rule.enabled,
      lastRunAt: newRun.startedAt.toISOString(),
      lastRunStatus: "running",
      createdAt: rule.createdAt.toISOString(),
    };

    res.status(201).json({ run, rule: ruleResponse });
  } catch (error) {
    console.error("[Processing] Error triggering run:", error);
    res.status(500).json({ error: "Failed to trigger run" });
  }
});

export { router as processingRouter };
