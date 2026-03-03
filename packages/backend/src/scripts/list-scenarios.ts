#!/usr/bin/env tsx
/**
 * CLI script to list all available test scenarios
 * Usage: npx tsx src/scripts/list-scenarios.ts
 */

import { allScenarios } from "../test/fixtures/scenarios/index.js";

function main(): void {
  console.log("=".repeat(70));
  console.log("Available Test Scenarios");
  console.log("=".repeat(70));
  console.log("");

  allScenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    console.log(`   Project: ${scenario.projectName}`);
    if (scenario.projectDescription) {
      console.log(`   Context: ${scenario.projectDescription}`);
    }
    console.log(`   Group ID: ${scenario.groupId}`);
    console.log(`   Messages: ${scenario.messages.length}`);

    if (scenario.existingTasks && scenario.existingTasks.length > 0) {
      console.log(`   Existing Tasks: ${scenario.existingTasks.length}`);
    }

    console.log("");
    console.log("   Sample Messages:");
    scenario.messages.slice(0, 2).forEach((msg, i) => {
      const preview =
        msg.text.length > 50 ? msg.text.substring(0, 50) + "..." : msg.text;
      console.log(`     ${i + 1}. [${msg.pushName}]: ${preview}`);
    });

    if (scenario.messages.length > 2) {
      console.log(`     ... and ${scenario.messages.length - 2} more`);
    }

    console.log("");
    console.log("-".repeat(70));
    console.log("");
  });

  console.log("Usage Examples:");
  console.log("  npx tsx src/scripts/test-scenario.ts simple-assignment");
  console.log("  npx tsx src/scripts/test-scenario.ts multi-task --verbose");
  console.log("  npx tsx src/scripts/test-scenario.ts off-topic");
  console.log("");
}

main();
