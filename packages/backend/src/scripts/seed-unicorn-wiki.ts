/**
 * Seeds demo wiki sections for the Unicorn Corp HQ project so that the
 * Wiki Graph UI has visible data even though WIKI_ENABLED is false in env
 * (which means the automatic wiki-updater worker didn't populate anything).
 *
 * Sections are anchored to real ingested message IDs so that the graph's
 * "shared source messages" edges appear naturally.
 *
 * Idempotent: deletes any prior sections owned by `llm-wiki-seeder` before
 * reinserting. Re-runnable.
 */

import { and, asc, eq, inArray, like, sql } from "drizzle-orm";
import { db } from "../db";
import {
  messages,
  projects,
  projectWikiSections,
  projectWikiRevisions,
} from "../db/schema";

const PROJECT_NAME = "Unicorn Corp HQ";
const SEEDER_ACTOR = "llm-wiki-seeder";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface Seed {
  kind:
    | "glossary"
    | "stakeholders"
    | "decisions"
    | "recurring_blockers"
    | "communication_patterns"
    | "observations";
  title: string;
  content: string;
  messageSearch: string[]; // substring(s) used to pin a message id
  confidence: number;
}

const SEEDS: Seed[] = [
  {
    kind: "glossary",
    title: "MORNING TASK PLAN format",
    content:
      "Team members send a structured 'MORNING TASK PLAN' each morning listing Top Priorities and Other Open Tasks. Expect these as structured task lists, not free-form chatter.",
    messageSearch: ["MORNING TASK PLAN"],
    confidence: 0.95,
  },
  {
    kind: "glossary",
    title: "END-OF-DAY UPDATE format",
    content:
      "End-of-day summaries follow sections: Completed Today, Pending, Issues / Blockers, Important Notes. Blockers announced here should surface as risks.",
    messageSearch: ["END-OF-DAY UPDATE", "END-OF-DAY UPDATES"],
    confidence: 0.95,
  },
  {
    kind: "glossary",
    title: "TIB, AQ, AA abbreviations",
    content:
      "TIB = main hospitality brand outlet; AQ = secondary F&B outlet; AA = Aloha Anywhere (marketing line). These acronyms recur across priorities.",
    messageSearch: ["TIB", "AQ"],
    confidence: 0.9,
  },
  {
    kind: "stakeholders",
    title: "Gabriel TIB — Finance Lead",
    content:
      "Owns 2025 book execution, balance sheet fixes, and tax-consultant data handoff. Morning plans read like a finance reconciliation backlog.",
    messageSearch: ["Gabriel TIB"],
    confidence: 0.88,
  },
  {
    kind: "stakeholders",
    title: "Michelle — Operations Lead",
    content:
      "Runs Daily Operational Issues, Ops Huddle, TIB Cocktails rollout, and maintenance optimization.",
    messageSearch: ["Michelle"],
    confidence: 0.88,
  },
  {
    kind: "stakeholders",
    title: "Abdurrahman Firdaus — Tech/AI",
    content:
      "Drives the Training Platform (Connect Team clone), AI Task Management tool, Tspoonlab sales import, Xero BNI/BRI API integration research.",
    messageSearch: ["Abdurrahman Firdaus"],
    confidence: 0.88,
  },
  {
    kind: "decisions",
    title: "Training Platform — Connect Team clone",
    content:
      "Decision to build an in-house 'Connect Team' clone for training; Abdurrahman owns the PRD and initial module rollout.",
    messageSearch: ["Training Platform", "Connect Team"],
    confidence: 0.85,
  },
  {
    kind: "recurring_blockers",
    title: "Tspoonlab Sales Import issue",
    content:
      "Sales import from Tspoonlab to Xero repeatedly breaks and blocks daily reconciliation. Investigated by Abdurrahman; affects Rolan's reconciliation tasks.",
    messageSearch: ["Tspoonlab", "Sales Import"],
    confidence: 0.9,
  },
  {
    kind: "recurring_blockers",
    title: "BNI/BRI API documentation missing",
    content:
      "Direct Xero integration is blocked until BNI and BRI hand over API docs. Listed multiple mornings as a follow-up.",
    messageSearch: ["BNI", "BRI"],
    confidence: 0.85,
  },
  {
    kind: "communication_patterns",
    title: "Daily cadence: morning plan + end-of-day update",
    content:
      "The team synchronizes twice daily: a morning priorities plan (~13:00–15:00 local) and an end-of-day summary (~22:00). Silence between is normal.",
    messageSearch: ["MORNING TASK PLAN", "END-OF-DAY"],
    confidence: 0.9,
  },
  {
    kind: "observations",
    title: "Multiple overdue items carried day-to-day",
    content:
      "Several tasks (ABCD grading, Plan Idul Fitri schedule, Team Room, TIB Alignment plan) recur across consecutive morning plans without being closed — watch for stagnation risk.",
    messageSearch: ["ABCD grading", "Team Room", "Idul fitri"],
    confidence: 0.75,
  },
  {
    kind: "observations",
    title: "Outlet visits and supplier negotiations",
    content:
      "Field operations include outlet visits, chicken supplier agreement (PT Mesari), and CCTV payment coordination for TIB.",
    messageSearch: ["outlet visit", "PT Mesari", "CCTV"],
    confidence: 0.8,
  },
];

async function findMessageIds(
  projectId: number,
  searches: string[],
  limit = 3,
): Promise<number[]> {
  const ids = new Set<number>();
  for (const term of searches) {
    const rows = await db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.projectId, projectId),
          sql`lower(${messages.messageText}) LIKE ${`%${term.toLowerCase()}%`}`,
        ),
      )
      .orderBy(asc(messages.fonnteDate))
      .limit(limit);
    for (const r of rows) ids.add(r.id);
  }
  return [...ids];
}

async function main() {
  const project = await db.query.projects.findFirst({
    where: eq(projects.name, PROJECT_NAME),
  });
  if (!project) {
    console.error(`[seed-wiki] Project "${PROJECT_NAME}" not found. Run simulate-unicorn-group first.`);
    process.exit(1);
  }
  const projectId = project.id;
  console.log(`[seed-wiki] Project id=${projectId}`);

  // Clear previous seeder rows (cascade cleans revisions).
  const prior = await db
    .select({ id: projectWikiSections.id })
    .from(projectWikiSections)
    .where(
      and(
        eq(projectWikiSections.projectId, projectId),
        like(projectWikiSections.createdBy, `${SEEDER_ACTOR}%`),
      ),
    );
  if (prior.length > 0) {
    const priorIds = prior.map((p) => p.id);
    await db.delete(projectWikiSections).where(inArray(projectWikiSections.id, priorIds));
    console.log(`[seed-wiki] Removed ${prior.length} prior seeded sections.`);
  }

  let created = 0;
  for (const seed of SEEDS) {
    const sourceMessageIds = await findMessageIds(projectId, seed.messageSearch);
    if (sourceMessageIds.length === 0) {
      console.log(
        `[seed-wiki] Skipping "${seed.title}" — no matching messages found.`,
      );
      continue;
    }

    const [row] = await db
      .insert(projectWikiSections)
      .values({
        projectId,
        kind: seed.kind,
        title: seed.title,
        content: seed.content,
        tokenEstimate: estimateTokens(seed.content),
        sourceMessageIds,
        confidence: seed.confidence,
        status: "active",
        createdBy: SEEDER_ACTOR,
        updatedBy: SEEDER_ACTOR,
      })
      .returning({ id: projectWikiSections.id });

    await db.insert(projectWikiRevisions).values({
      sectionId: row.id,
      previousContent: null,
      newContent: seed.content,
      diffSummary: "initial demo seed",
      sourceMessageIds,
      confidence: seed.confidence,
      actor: SEEDER_ACTOR,
      reviewState: "auto_applied",
      appliedAt: new Date(),
    });
    created++;
    console.log(
      `[seed-wiki] Created [${seed.kind}] "${seed.title}" with ${sourceMessageIds.length} source message id(s).`,
    );
  }

  console.log(`[seed-wiki] Done. ${created} section(s) created.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
