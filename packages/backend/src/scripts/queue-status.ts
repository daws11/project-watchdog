import postgres from "postgres";
import { env } from "../config/env";

async function main() {
  const sql = postgres(env.DATABASE_URL);
  try {
    const rows = await sql<
      { name: string; state: string; count: string }[]
    >`SELECT name, state, count(*)::text AS count
      FROM pgboss.job
      WHERE name LIKE 'process-batch%' OR name LIKE 'detect-risks%' OR name LIKE 'wiki-update%' OR name LIKE 'generate-report%'
      GROUP BY name, state
      ORDER BY name, state`;
    console.log("pg-boss job states:");
    for (const r of rows) console.log(`  ${r.name.padEnd(20)} ${r.state.padEnd(12)} ${r.count}`);
    if (rows.length === 0) console.log("  (no jobs found)");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
