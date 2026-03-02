/**
 * Reset database: truncate all tables except users.
 * Use for development/testing when you want to clear data but keep user accounts.
 *
 * Usage: pnpm db:reset
 */
import { sql } from "drizzle-orm";
import "../config/dotenv";
import { db } from "../db";

const TABLES_TO_TRUNCATE = [
  "projects", // cascades to connections, messages, reports, risks, tasks
  "people_settings",
  "processing_rules", // cascades to processing_runs
  "api_keys",
  "smtp_settings",
  "wa_ingestor_commands",
] as const;

const run = async () => {
  const tableList = TABLES_TO_TRUNCATE.join(", ");
  console.log(`[db:reset] Truncating tables (keeping users): ${tableList}`);

  await db.execute(
    sql`TRUNCATE TABLE ${sql.raw(tableList)} RESTART IDENTITY CASCADE`,
  );

  console.log("[db:reset] Database reset complete. Users table preserved.");
};

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[db:reset] Failed:", error);
    process.exit(1);
  });
