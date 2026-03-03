#!/usr/bin/env tsx
/**
 * CLI script to cleanup all test data
 * Usage: npx tsx src/scripts/cleanup-test-data.ts [--confirm]
 */

import { cleanupAllTestData } from "../test/utils/seed-messages.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const confirmed = args.includes("--confirm") || args.includes("-y");

  console.log("=".repeat(60));
  console.log("Test Data Cleanup");
  console.log("=".repeat(60));
  console.log("");

  if (!confirmed) {
    console.log("WARNING: This will delete all test data from the database.");
    console.log("Test data is identified by the '[TEST]' prefix in project names.");
    console.log("");
    console.log("Run with --confirm or -y to proceed.");
    console.log("Example: npx tsx src/scripts/cleanup-test-data.ts --confirm");
    console.log("");
    process.exit(0);
  }

  try {
    console.log("Cleaning up test data...\n");
    await cleanupAllTestData();
    console.log("\n✓ Cleanup complete!");
  } catch (error) {
    console.error("\n✗ Error during cleanup:", error);
    process.exit(1);
  }
}

main();
