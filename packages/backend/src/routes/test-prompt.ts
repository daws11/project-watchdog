import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { tasks, messages, projects, connections } from "../db/schema";
import {
  allScenarios,
  getScenarioByName,
  simpleAssignmentExpected,
  multiTaskExpected,
  withExistingTasksExpected,
  offTopicExpected,
  mixedLanguageExpected,
  deadlineExtractionExpected,
} from "../test/fixtures/scenarios/index.js";
import {
  seedTestScenario,
  cleanupTestScenario,
  type SeededScenarioResult,
} from "../test/utils/seed-messages.js";
import { runTaskExtractorOnce } from "../test/utils/trigger-worker.js";

const router = Router();

/**
 * POST /api/test/run-scenario
 * Run a specific test scenario
 */
router.post("/run-scenario", async (req, res) => {
  const { scenarioId, verbose = false } = req.body;

  if (!scenarioId) {
    return res.status(400).json({
      success: false,
      error: "Missing required field: scenarioId",
    });
  }

  const scenario = getScenarioByName(scenarioId);
  if (!scenario) {
    return res.status(404).json({
      success: false,
      error: `Unknown scenario: ${scenarioId}`,
      availableScenarios: allScenarios.map((s) => s.name),
    });
  }

  try {
    // 1. Seed test data
    const startTime = Date.now();
    const result = await seedTestScenario(scenario);

    // 2. Run task extractor
    const processingResult = await runTaskExtractorOnce(result.messageIds);
    const processingTimeMs = Date.now() - startTime;

    if (!processingResult.success) {
      // Cleanup on failure
      await cleanupTestScenario(result);

      return res.status(500).json({
        success: false,
        error: processingResult.error || "Processing failed",
        scenario: scenarioId,
      });
    }

    // 3. Get expected results for validation
    let expected = null;
    switch (scenario.name) {
      case "simple-assignment":
        expected = simpleAssignmentExpected;
        break;
      case "multi-task":
        expected = multiTaskExpected;
        break;
      case "with-existing-tasks":
        expected = withExistingTasksExpected;
        break;
      case "off-topic":
        expected = offTopicExpected;
        break;
      case "mixed-language":
        expected = mixedLanguageExpected;
        break;
      case "deadline-extraction":
        expected = deadlineExtractionExpected;
        break;
    }

    // 4. Validate results
    const validation: {
      taskCountMatch: boolean;
      expectedCount: number;
      actualCount: number;
      patternMatches: Array<{
        pattern: string;
        matched: boolean;
        task?: string;
      }>;
    } = {
      taskCountMatch: processingResult.extractedTasks.length === (expected?.taskCount || 0),
      expectedCount: expected?.taskCount || 0,
      actualCount: processingResult.extractedTasks.length,
      patternMatches: [],
    };

    if (expected?.tasks) {
      for (const exp of expected.tasks) {
        const matchingTask = processingResult.extractedTasks.find((t) =>
          t.description.match(new RegExp(exp.descriptionPattern, "i")),
        );
        validation.patternMatches.push({
          pattern: exp.descriptionPattern,
          matched: !!matchingTask,
          task: matchingTask?.description,
        });
      }
    }

    // 5. Build response
    const response: {
      success: boolean;
      scenario: string;
      projectId: number;
      messageIds: number[];
      extractedTasks: Array<{
        id: number;
        description: string;
        owner: string | null;
        deadline: string | null;
        confidence: number;
      }>;
      validation: typeof validation;
      processingTimeMs: number;
      verbose?: {
        projectName: string;
        projectDescription?: string;
        groupId: string;
        messages: Array<{
          sender: string;
          pushName: string;
          text: string;
        }>;
      };
    } = {
      success: true,
      scenario: scenarioId,
      projectId: result.projectId,
      messageIds: result.messageIds,
      extractedTasks: processingResult.extractedTasks.map((t) => ({
        id: t.id,
        description: t.description,
        owner: t.owner,
        deadline: t.deadline ? t.deadline.toISOString() : null,
        confidence: t.confidence,
      })),
      validation,
      processingTimeMs,
    };

    if (verbose) {
      response.verbose = {
        projectName: scenario.projectName,
        projectDescription: scenario.projectDescription,
        groupId: scenario.groupId,
        messages: scenario.messages.map((m) => ({
          sender: m.sender,
          pushName: m.pushName,
          text: m.text,
        })),
      };
    }

    // 6. Cleanup test data after response
    // Note: In a real scenario, you might want to keep test data for inspection
    // For now, we clean up immediately
    await cleanupTestScenario(result);

    return res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TestPrompt] Error running scenario:", error);

    return res.status(500).json({
      success: false,
      error: errorMessage,
      scenario: scenarioId,
    });
  }
});

/**
 * GET /api/test/scenarios
 * List all available scenarios
 */
router.get("/scenarios", (_req, res) => {
  const scenarios = allScenarios.map((s) => ({
    id: s.name,
    projectName: s.projectName,
    description: s.projectDescription,
    messageCount: s.messages.length,
    hasExistingTasks: (s.existingTasks?.length || 0) > 0,
    sampleMessages: s.messages.slice(0, 2).map((m) => ({
      sender: m.pushName,
      preview:
        m.text.length > 60 ? m.text.substring(0, 60) + "..." : m.text,
    })),
  }));

  res.json({
    success: true,
    scenarios,
  });
});

/**
 * POST /api/test/cleanup
 * Cleanup all test data
 */
router.post("/cleanup", async (_req, res) => {
  try {
    await cleanupAllTestData();

    res.json({
      success: true,
      message: "All test data cleaned up",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TestPrompt] Error during cleanup:", error);

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/test/ingest-custom
 * Ingest custom messages for testing
 */
router.post("/ingest-custom", async (req, res) => {
  const { projectId, messages: customMessages } = req.body;

  if (!projectId || !customMessages || !Array.isArray(customMessages)) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: projectId, messages (array)",
    });
  }

  try {
    // Find connection for project
    const connection = await db.query.connections.findFirst({
      where: eq(connections.projectId, projectId),
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: "No connection found for project",
      });
    }

    const insertedIds: number[] = [];

    for (const msg of customMessages) {
      const messageHash = `custom-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const result = await db
        .insert(messages)
        .values({
          connectionId: connection.id,
          projectId,
          sender: msg.sender || "test@c.us",
          pushName: msg.pushName || "Test User",
          messageText: msg.text,
          messageHash,
          isGroup: true,
          fonnteDate: new Date(),
          processed: false,
        })
        .returning();

      insertedIds.push(result[0].id);
    }

    // Process immediately
    const processingResult = await runTaskExtractorOnce(insertedIds);

    res.json({
      success: true,
      messageIds: insertedIds,
      extractedTasks: processingResult.extractedTasks,
      processingTimeMs: processingResult.processingTimeMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TestPrompt] Error ingesting custom messages:", error);

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Import cleanupAllTestData from utils
import { cleanupAllTestData } from "../test/utils/seed-messages.js";

export default router;
