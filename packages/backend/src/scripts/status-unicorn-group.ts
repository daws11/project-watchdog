/**
 * Reports the pipeline status for the simulated "Unicorn Corp HQ" project.
 * Safe to run repeatedly. Read-only.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  messages,
  projects,
  projectWikiRevisions,
  projectWikiSections,
  reports,
  risks,
  tasks,
} from "../db/schema";

const PROJECT_NAME = "Unicorn Corp HQ";

async function main() {
  const project = await db.query.projects.findFirst({
    where: eq(projects.name, PROJECT_NAME),
  });
  if (!project) {
    console.log(`[status] Project "${PROJECT_NAME}" not found. Run simulate-unicorn-group first.`);
    return;
  }

  const projectId = project.id;

  const [msgStats] = await db
    .select({
      total: sql<string>`count(*)::text`,
      processed: sql<string>`sum(case when processed then 1 else 0 end)::text`,
    })
    .from(messages)
    .where(eq(messages.projectId, projectId));

  const taskRows = await db
    .select({
      status: tasks.status,
      count: sql<string>`count(*)::text`,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .groupBy(tasks.status);

  const [riskCount] = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(risks)
    .where(eq(risks.projectId, projectId));

  const riskBySeverity = await db
    .select({
      severity: risks.severity,
      count: sql<string>`count(*)::text`,
    })
    .from(risks)
    .where(eq(risks.projectId, projectId))
    .groupBy(risks.severity);

  const [reportCount] = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(reports)
    .where(eq(reports.projectId, projectId));

  const wikiRows = await db
    .select({
      kind: projectWikiSections.kind,
      count: sql<string>`count(*)::text`,
    })
    .from(projectWikiSections)
    .where(eq(projectWikiSections.projectId, projectId))
    .groupBy(projectWikiSections.kind);

  const [wikiRevTotal] = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(projectWikiRevisions)
    .innerJoin(
      projectWikiSections,
      eq(projectWikiRevisions.sectionId, projectWikiSections.id),
    )
    .where(eq(projectWikiSections.projectId, projectId));

  const wikiRevByState = await db
    .select({
      state: projectWikiRevisions.reviewState,
      count: sql<string>`count(*)::text`,
    })
    .from(projectWikiRevisions)
    .innerJoin(
      projectWikiSections,
      eq(projectWikiRevisions.sectionId, projectWikiSections.id),
    )
    .where(eq(projectWikiSections.projectId, projectId))
    .groupBy(projectWikiRevisions.reviewState);

  const sampleTasks = await db
    .select({
      id: tasks.id,
      description: tasks.description,
      owner: tasks.owner,
      confidence: tasks.confidence,
      deadline: tasks.deadline,
      status: tasks.status,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(desc(tasks.confidence))
    .limit(10);

  const sampleRisks = await db
    .select()
    .from(risks)
    .where(eq(risks.projectId, projectId))
    .orderBy(desc(risks.createdAt))
    .limit(5);

  const sampleWiki = await db
    .select()
    .from(projectWikiSections)
    .where(
      and(
        eq(projectWikiSections.projectId, projectId),
        eq(projectWikiSections.status, "active"),
      ),
    )
    .orderBy(desc(projectWikiSections.updatedAt))
    .limit(10);

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  PIPELINE STATUS — ${PROJECT_NAME} (project ${projectId})`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("📥 MESSAGES");
  console.log(
    `   total: ${msgStats.total}    processed: ${msgStats.processed}    unprocessed: ${Number(msgStats.total) - Number(msgStats.processed)}`,
  );
  console.log("");
  console.log("📋 TASKS");
  if (taskRows.length === 0) {
    console.log("   (none yet — extractor still running or no tasks found)");
  } else {
    for (const t of taskRows) {
      console.log(`   ${t.status.padEnd(10)} ${t.count}`);
    }
  }
  console.log("");
  console.log("⚠️  RISKS");
  console.log(`   total: ${riskCount.count}`);
  for (const r of riskBySeverity) {
    console.log(`   ${r.severity.padEnd(10)} ${r.count}`);
  }
  console.log("");
  console.log("📰 REPORTS");
  console.log(`   total: ${reportCount.count}`);
  console.log("");
  console.log("📚 WIKI");
  console.log(`   revisions total: ${wikiRevTotal.count}`);
  if (wikiRows.length === 0) {
    console.log("   (no sections yet)");
  } else {
    for (const w of wikiRows) {
      console.log(`   ${w.kind.padEnd(22)} ${w.count}`);
    }
  }
  if (wikiRevByState.length > 0) {
    console.log("   revision states:");
    for (const r of wikiRevByState) {
      console.log(`     ${r.state.padEnd(14)} ${r.count}`);
    }
  }
  console.log("");

  if (sampleTasks.length > 0) {
    console.log("─────── top 10 tasks by confidence ────────────────────────");
    for (const t of sampleTasks) {
      const desc = t.description.slice(0, 70);
      const owner = t.owner ?? "—";
      const dl = t.deadline ? t.deadline.toISOString().slice(0, 10) : "—";
      console.log(
        `   #${t.id} [${t.status}] conf=${t.confidence.toFixed(2)} owner=${owner.slice(0, 15).padEnd(15)} dl=${dl}  ${desc}`,
      );
    }
    console.log("");
  }

  if (sampleRisks.length > 0) {
    console.log("─────── recent risks ──────────────────────────────────────");
    for (const r of sampleRisks) {
      console.log(
        `   [${r.severity}/${r.type}] ${r.explanation.slice(0, 80)}`,
      );
      if (r.recommendation) {
        console.log(`      → ${r.recommendation.slice(0, 80)}`);
      }
    }
    console.log("");
  }

  if (sampleWiki.length > 0) {
    console.log("─────── recent wiki sections ──────────────────────────────");
    for (const w of sampleWiki) {
      console.log(
        `   [${w.kind}] "${w.title}" — ${w.content.slice(0, 70)}`,
      );
    }
    console.log("");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
