import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { env } from "../config/env";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "db", "migrations");
const TARGET_TAG = process.argv[2];

if (!TARGET_TAG) {
  console.error("usage: apply-migration <tag>  (e.g. 0009_certain_master_chief)");
  process.exit(1);
}

async function main() {
  const sqlPath = join(MIGRATIONS_DIR, `${TARGET_TAG}.sql`);
  const sqlContent = readFileSync(sqlPath, "utf8");
  const hash = createHash("sha256").update(sqlContent).digest("hex");
  console.log(`[migrate] Target: ${TARGET_TAG}`);
  console.log(`[migrate] Hash:   ${hash}`);

  const sql = postgres(env.DATABASE_URL);
  try {
    const existing = await sql`
      SELECT id FROM drizzle.__drizzle_migrations WHERE hash = ${hash}
    `;
    if (existing.length > 0) {
      console.log(
        `[migrate] Already applied (row id=${existing[0].id}), nothing to do.`,
      );
      return;
    }

    const statements = sqlContent
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`[migrate] Applying ${statements.length} statements...`);
    await sql.begin(async (tx) => {
      for (const stmt of statements) {
        await tx.unsafe(stmt);
      }
      await tx.unsafe(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [hash, String(Date.now())],
      );
    });
    console.log(`[migrate] OK — ${TARGET_TAG} applied and recorded.`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
