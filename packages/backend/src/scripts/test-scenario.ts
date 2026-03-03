#!/usr/bin/env tsx
/**
 * CLI script to run a specific test scenario
 * Usage: npx tsx src/scripts/test-scenario.ts <scenario-name> [--verbose]
 */

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
} from "../test/utils/seed-messages.js";
import { runTaskExtractorOnce } from "../test/utils/trigger-worker.js";

function printUsage(): void {
  console.log("Usage: npx tsx src/scripts/test-scenario.ts <scenario-name> [--verbose]");
  console.log("");
  console.log("Available scenarios:");
  allScenarios.forEach((s) => {
    console.log(`  - ${s.name}: ${s.projectName}`);
  });
  console.log("");
  console.log("Examples:");
  console.log('  npx tsx src/scripts/test-scenario.ts simple-assignment');
  console.log('  npx tsx src/scripts/test-scenario.ts multi-task --verbose');
  console.log('  npx tsx src/scripts/test-scenario.ts off-topic');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const scenarioName = args[0];
  const verbose = args.includes("--verbose") || args.includes("-v");

  if (!scenarioName || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const scenario = getScenarioByName(scenarioName);
  if (!scenario) {
    console.error(`Error: Unknown scenario "${scenarioName}"`);
    console.log("");
    printUsage();
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log(`Running scenario: ${scenario.name}`);
  console.log(`Description: ${scenario.projectName}`);
  if (scenario.projectDescription) {
    console.log(`Context: ${scenario.projectDescription}`);
  }
  console.log("=".repeat(60));

  try {
    // 1. Seed test data
    console.log("\n[1/4] Seeding test data...");
    const result = await seedTestScenario(scenario);
    console.log(`  - Project ID: ${result.projectId}`);
    console.log(`  - Connection ID: ${result.connectionId}`);
    console.log(`  - Messages: ${result.messageIds.length}`);

    if (verbose) {
      console.log("\n  Messages:");
      scenario.messages.forEach((m, i) => {
        console.log(`    ${i + 1}. [${m.pushName}]: ${m.text.substring(0, 60)}${m.text.length > 60 ? "..." : ""}`);
      });
    }

    // 2. Run task extractor
    console.log("\n[2/4] Running task extractor...");
    const processingResult = await runTaskExtractorOnce(result.messageIds);

    if (!processingResult.success) {
      console.error("  ✗ Processing failed:", processingResult.error);
      await cleanupTestScenario(result);
      process.exit(1);
    }

    console.log(`  ✓ Processing complete in ${processingResult.processingTimeMs}ms`);
    console.log(`  ✓ Extracted ${processingResult.extractedTasks.length} tasks`);

    // 3. Display results
    console.log("\n[3/4] Results:");
    if (processingResult.extractedTasks.length === 0) {
      console.log("  No tasks extracted");
    } else {
      processingResult.extractedTasks.forEach((task, i) => {
        console.log(`\n  Task ${i + 1}:`);
        console.log(`    Description: ${task.description}`);
        console.log(`    Assignee: ${task.owner || "-"}`);
        console.log(`    Deadline: ${task.deadline ? task.deadline.toISOString() : "-"}`);
        console.log(`    Confidence: ${task.confidence.toFixed(2)}`);
      });
    }

    // 4. Validate against expected results
    console.log("\n[4/4] Validation:");

    // Get expected results based on scenario
    let expected;
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
      default:
        expected = null;
    }

    if (expected) {
      const taskCountMatch =
        processingResult.extractedTasks.length === expected.taskCount;
      console.log(
        `  ${taskCountMatch ? "✓" : "✗"} Task count: expected ${expected.taskCount}, got ${processingResult.extractedTasks.length}`,
      );

      if (expected.tasks.length > 0) {
        console.log("\n  Expected patterns:");
        expected.tasks.forEach((exp) => {
          const matchingTask = processingResult.extractedTasks.find((t) =>
            t.description.match(new RegExp(exp.descriptionPattern, "i")),
          );
          if (matchingTask) {
            console.log(`    ✓ Pattern "${exp.descriptionPattern}" matched`);
            if (exp.minConfidence) {
              const confidenceOk =
                matchingTask.confidence >= exp.minConfidence;
              console.log(
                `      ${confidenceOk ? "✓" : "✗"} Confidence ${matchingTask.confidence.toFixed(2)} >= ${exp.minConfidence}`,
              );
            }
          } else {
            console.log(`    ✗ Pattern "${exp.descriptionPattern}" NOT matched`);
          }
        });
      }
    } else {
      console.log("  No expected results defined for validation");
    }

    // 5. Cleanup
    console.log("\n[Cleanup] Removing test data...");
    await cleanupTestScenario(result);
    console.log("  ✓ Test data cleaned up");

    console.log("\n" + "=".repeat(60));
    console.log("Scenario complete!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n✗ Error running scenario:", error);
    process.exit(1);
  }
}

main();
