import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { connections } from "../db/schema";
import { db } from "../db";
import { env, validateEnvironment } from "../config/env";

type CheckLevel = "ok" | "warn" | "fail";

interface CheckResult {
  name: string;
  level: CheckLevel;
  detail: string;
}

const strictMode =
  process.argv.includes("--strict") ||
  process.env.PREDEPLOY_STRICT === "1" ||
  process.env.PREDEPLOY_STRICT === "true";

const results: CheckResult[] = [];

const addResult = (name: string, level: CheckLevel, detail: string) => {
  results.push({ name, level, detail });
};

const statusLabel: Record<CheckLevel, string> = {
  ok: "[OK]",
  warn: "[WARN]",
  fail: "[FAIL]",
};

const checkMigrationFiles = async () => {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);
  const migrationsDir = path.resolve(currentDir, "../db/migrations");

  try {
    const entries = await readdir(migrationsDir);
    const sqlFiles = entries.filter((entry) => entry.endsWith(".sql"));

    if (sqlFiles.length === 0) {
      addResult(
        "Migrations generated",
        "fail",
        "No SQL migration files found in packages/backend/src/db/migrations.",
      );
      return;
    }

    addResult(
      "Migrations generated",
      "ok",
      `${sqlFiles.length} migration file(s) found in repository.`,
    );
  } catch (error) {
    addResult(
      "Migrations generated",
      "fail",
      `Unable to read migration directory: ${String(error)}`,
    );
  }
};

const checkDatabaseAndAppliedMigrations = async () => {
  try {
    await db.execute(sql`select 1`);
    addResult("PostgreSQL connectivity", "ok", "Database connection verified.");
  } catch (error) {
    addResult(
      "PostgreSQL connectivity",
      "fail",
      `Cannot connect to database using DATABASE_URL: ${String(error)}`,
    );
    addResult(
      "Migrations applied",
      "fail",
      "Skipped because database connection failed.",
    );
    return;
  }

  try {
    const migrationCountRows = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from __drizzle_migrations`,
    );
    const migrationCount = Number(migrationCountRows[0]?.count ?? 0);

    if (migrationCount > 0) {
      addResult(
        "Migrations applied",
        "ok",
        `__drizzle_migrations contains ${migrationCount} record(s).`,
      );
    } else {
      addResult(
        "Migrations applied",
        "warn",
        "__drizzle_migrations exists but has no applied migrations.",
      );
    }
  } catch {
    addResult(
      "Migrations applied",
      "fail",
      "Table __drizzle_migrations was not found. Run `pnpm db:migrate`.",
    );
  }
};

const checkEnvironment = () => {
  const envValidation = validateEnvironment({ strict: false });
  const warningDetail = envValidation.warnings.join(" ");

  if (warningDetail) {
    addResult("Environment variables", "warn", warningDetail);
  } else {
    addResult("Environment variables", "ok", "All expected environment values are set.");
  }

  if (!env.JWT_SECRET) {
    addResult("JWT secret", "warn", "JWT_SECRET is missing.");
  } else if (env.JWT_SECRET.length < 32) {
    addResult(
      "JWT secret",
      "warn",
      `JWT_SECRET is ${env.JWT_SECRET.length} chars; minimum is 32.`,
    );
  } else {
    addResult("JWT secret", "ok", "JWT_SECRET length is valid (>= 32 chars).");
  }

  if (!env.WHATSAPP_INGEST_TOKEN) {
    addResult("WhatsApp ingest token", "warn", "WHATSAPP_INGEST_TOKEN is missing (required for WhatsApp Web integration).");
  } else {
    addResult("WhatsApp ingest token", "ok", "WHATSAPP_INGEST_TOKEN is configured.");
  }

  if (env.LLM_PROVIDER === "openai") {
    if (!env.OPENAI_API_KEY) {
      addResult(
        "OpenAI API key",
        "warn",
        "OPENAI_API_KEY is missing. Key presence check failed (no live ping in local mode).",
      );
    } else {
      addResult(
        "OpenAI API key",
        "ok",
        "OPENAI_API_KEY is present (format-only check).",
      );
    }
  } else {
    if (!env.MOONSHOT_API_KEY) {
      addResult(
        "Moonshot (Kimi) API key",
        "warn",
        "MOONSHOT_API_KEY is missing. Key presence check failed (no live ping in local mode).",
      );
    } else {
      addResult(
        "Moonshot (Kimi) API key",
        "ok",
        "MOONSHOT_API_KEY is present (format-only check).",
      );
    }
  }
};

const checkTestWhatsAppConnection = async () => {
  try {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(connections);
    const connectionCount = Number(rows[0]?.count ?? 0);

    if (connectionCount > 0) {
      addResult(
        "Test WhatsApp group connection",
        "ok",
        `${connectionCount} connection record(s) found in database.`,
      );
    } else {
      addResult(
        "Test WhatsApp group connection",
        "warn",
        "No records found in connections table. Create and connect a test WhatsApp group.",
      );
    }
  } catch (error) {
    addResult(
      "Test WhatsApp group connection",
      "fail",
      `Unable to verify connections table: ${String(error)}`,
    );
  }
};

const printSummaryAndExit = () => {
  const okCount = results.filter((item) => item.level === "ok").length;
  const warnCount = results.filter((item) => item.level === "warn").length;
  const failCount = results.filter((item) => item.level === "fail").length;

  console.log("== Project Watchdog Pre-deployment Check ==");
  console.log(`Mode: ${strictMode ? "strict" : "local"}\n`);

  for (const result of results) {
    console.log(`${statusLabel[result.level]} ${result.name}: ${result.detail}`);
  }

  console.log(
    `\nResult: ${okCount} OK, ${warnCount} WARN, ${failCount} FAIL`,
  );

  if (failCount > 0) {
    process.exit(1);
  }

  if (strictMode && warnCount > 0) {
    console.error(
      "Strict mode failed because one or more checklist items are incomplete.",
    );
    process.exit(1);
  }

  if (warnCount > 0) {
    console.warn(
      "Pre-deployment finished with warnings. Resolve warnings before real deployment.",
    );
  } else {
    console.log("Pre-deployment checks passed.");
  }
};

const run = async () => {
  await checkMigrationFiles();
  await checkDatabaseAndAppliedMigrations();
  checkEnvironment();
  await checkTestWhatsAppConnection();
  printSummaryAndExit();
};

run().catch((error) => {
  console.error("[predeploy] Unexpected failure:", error);
  process.exit(1);
});
