import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  projectWikiRevisions,
  projectWikiSections,
  type NewWikiRevisionRow,
  type WikiSectionRow,
} from "../db/schema";
import { env } from "../config/env";

export type WikiKind =
  | "glossary"
  | "stakeholders"
  | "decisions"
  | "recurring_blockers"
  | "communication_patterns"
  | "observations";

export const WIKI_KINDS: readonly WikiKind[] = [
  "glossary",
  "stakeholders",
  "decisions",
  "recurring_blockers",
  "communication_patterns",
  "observations",
] as const;

// Ordered from most stable (best for prompt cache prefix) to most volatile.
const KIND_PRIORITY: Record<WikiKind, number> = {
  glossary: 0,
  stakeholders: 1,
  decisions: 2,
  recurring_blockers: 3,
  communication_patterns: 4,
  observations: 5,
};

const KIND_HEADINGS: Record<WikiKind, string> = {
  glossary: "Glossary",
  stakeholders: "Stakeholders",
  decisions: "Decisions",
  recurring_blockers: "Recurring Blockers",
  communication_patterns: "Communication Patterns",
  observations: "Observations",
};

export function isWikiKind(value: string): value is WikiKind {
  return (WIKI_KINDS as readonly string[]).includes(value);
}

/**
 * Rough token count estimate. 1 token ≈ 4 chars for English+Indonesian mix is
 * good enough for budget-packing; we don't need tiktoken precision here.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Fetch active sections for a project, ordered by kind priority then recency,
 * and greedy-pack them until the cumulative token estimate would exceed
 * `maxTokens`. Section prioritas tinggi (glossary → stakeholders → ...) masuk
 * duluan; section volatile (observations) di ekor.
 *
 * Returns an empty array when WIKI is disabled or no section matches.
 */
export async function selectWikiSections(
  projectId: number,
  maxTokens: number = env.WIKI_MAX_TOKENS,
): Promise<WikiSectionRow[]> {
  if (!env.WIKI_ENABLED) return [];

  const rows = await db
    .select()
    .from(projectWikiSections)
    .where(
      and(
        eq(projectWikiSections.projectId, projectId),
        eq(projectWikiSections.status, "active"),
      ),
    )
    .orderBy(desc(projectWikiSections.updatedAt));

  rows.sort((a, b) => {
    const pa = KIND_PRIORITY[a.kind as WikiKind] ?? 99;
    const pb = KIND_PRIORITY[b.kind as WikiKind] ?? 99;
    if (pa !== pb) return pa - pb;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const selected: WikiSectionRow[] = [];
  let tokensUsed = 0;
  for (const row of rows) {
    const cost = row.tokenEstimate > 0 ? row.tokenEstimate : estimateTokens(row.content);
    if (tokensUsed + cost > maxTokens) continue;
    selected.push(row);
    tokensUsed += cost;
  }

  return selected;
}

/**
 * Render selected sections as a markdown block, grouped by kind. Group order
 * follows KIND_PRIORITY so the prompt prefix stays stable across batches —
 * important for prompt caching.
 */
export function formatSectionsForPrompt(sections: WikiSectionRow[]): string | null {
  if (sections.length === 0) return null;

  const grouped = new Map<WikiKind, WikiSectionRow[]>();
  for (const section of sections) {
    if (!isWikiKind(section.kind)) continue;
    const bucket = grouped.get(section.kind) ?? [];
    bucket.push(section);
    grouped.set(section.kind, bucket);
  }

  const orderedKinds = [...grouped.keys()].sort(
    (a, b) => KIND_PRIORITY[a] - KIND_PRIORITY[b],
  );

  const parts: string[] = [];
  for (const kind of orderedKinds) {
    parts.push(`### ${KIND_HEADINGS[kind]}`);
    const items = grouped.get(kind) ?? [];
    for (const item of items) {
      parts.push(`- **${item.title}**: ${item.content}`);
    }
  }

  return parts.join("\n");
}

export interface UpsertSectionInput {
  projectId: number;
  kind: WikiKind;
  title: string;
  content: string;
  sourceMessageIds: number[];
  confidence: number;
  actor: string;
  reviewState: "auto_applied" | "approved";
}

export interface UpsertSectionResult {
  sectionId: number;
  revisionId: number;
  operation: "created" | "updated" | "noop";
}

/**
 * Upsert a section (by unique `(project_id, kind, title)`) and always record a
 * revision row. Returns the revision row id so callers can include it in logs
 * or API responses.
 */
export async function upsertSectionWithRevision(
  input: UpsertSectionInput,
): Promise<UpsertSectionResult> {
  const tokenEstimate = estimateTokens(input.content);
  const now = new Date();

  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(projectWikiSections)
      .where(
        and(
          eq(projectWikiSections.projectId, input.projectId),
          eq(projectWikiSections.kind, input.kind),
          eq(projectWikiSections.title, input.title),
        ),
      )
      .limit(1);

    let sectionId: number;
    let previousContent: string | null = null;
    let operation: "created" | "updated" | "noop" = "created";

    if (existing.length === 0) {
      const [row] = await tx
        .insert(projectWikiSections)
        .values({
          projectId: input.projectId,
          kind: input.kind,
          title: input.title,
          content: input.content,
          tokenEstimate,
          sourceMessageIds: input.sourceMessageIds,
          confidence: input.confidence,
          status: "active",
          createdBy: input.actor,
          updatedBy: input.actor,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: projectWikiSections.id });
      sectionId = row.id;
      operation = "created";
    } else {
      const current = existing[0];
      sectionId = current.id;
      previousContent = current.content;
      if (current.content === input.content) {
        operation = "noop";
      } else {
        operation = "updated";
        await tx
          .update(projectWikiSections)
          .set({
            content: input.content,
            tokenEstimate,
            sourceMessageIds: input.sourceMessageIds,
            confidence: input.confidence,
            updatedBy: input.actor,
            updatedAt: now,
            status: "active",
          })
          .where(eq(projectWikiSections.id, sectionId));
      }
    }

    const revisionValues: NewWikiRevisionRow = {
      sectionId,
      previousContent,
      newContent: input.content,
      diffSummary: null,
      sourceMessageIds: input.sourceMessageIds,
      confidence: input.confidence,
      actor: input.actor,
      reviewState: input.reviewState,
      appliedAt: now,
    };
    const [rev] = await tx
      .insert(projectWikiRevisions)
      .values(revisionValues)
      .returning({ id: projectWikiRevisions.id });

    return { sectionId, revisionId: rev.id, operation };
  });
}

/**
 * Insert a pending revision WITHOUT touching the section. Used when a kind
 * requires manual review (glossary, stakeholders, decisions) or when LLM
 * confidence is below threshold.
 *
 * For create proposals where the section doesn't exist yet, the revision
 * still needs a section_id — so we create a placeholder section with
 * `status = 'pending_review'` and point the revision to it. The placeholder
 * is never surfaced to `selectWikiSections` (which filters on status='active').
 */
export async function createPendingRevision(input: {
  projectId: number;
  kind: WikiKind;
  title: string;
  proposedContent: string;
  sourceMessageIds: number[];
  confidence: number;
  diffSummary: string | null;
  actor: string;
}): Promise<{ sectionId: number; revisionId: number }> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(projectWikiSections)
      .where(
        and(
          eq(projectWikiSections.projectId, input.projectId),
          eq(projectWikiSections.kind, input.kind),
          eq(projectWikiSections.title, input.title),
        ),
      )
      .limit(1);

    let sectionId: number;
    let previousContent: string | null = null;

    if (existing.length === 0) {
      const [row] = await tx
        .insert(projectWikiSections)
        .values({
          projectId: input.projectId,
          kind: input.kind,
          title: input.title,
          content: "",
          tokenEstimate: 0,
          sourceMessageIds: input.sourceMessageIds,
          confidence: input.confidence,
          status: "pending_review",
          createdBy: input.actor,
          updatedBy: input.actor,
        })
        .returning({ id: projectWikiSections.id });
      sectionId = row.id;
    } else {
      sectionId = existing[0].id;
      previousContent = existing[0].content;
    }

    const [rev] = await tx
      .insert(projectWikiRevisions)
      .values({
        sectionId,
        previousContent,
        newContent: input.proposedContent,
        diffSummary: input.diffSummary,
        sourceMessageIds: input.sourceMessageIds,
        confidence: input.confidence,
        actor: input.actor,
        reviewState: "pending",
      })
      .returning({ id: projectWikiRevisions.id });

    return { sectionId, revisionId: rev.id };
  });
}

/**
 * Apply an already-persisted revision to its section (used by the review
 * queue approve endpoint). Sets the section back to `status='active'` if it
 * was in `pending_review`.
 */
export async function applyRevision(
  revisionId: number,
  approver: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [rev] = await tx
      .select()
      .from(projectWikiRevisions)
      .where(eq(projectWikiRevisions.id, revisionId))
      .limit(1);
    if (!rev) throw new Error(`revision ${revisionId} not found`);

    const tokenEstimate = estimateTokens(rev.newContent);
    await tx
      .update(projectWikiSections)
      .set({
        content: rev.newContent,
        tokenEstimate,
        sourceMessageIds: rev.sourceMessageIds,
        confidence: rev.confidence,
        updatedBy: approver,
        updatedAt: new Date(),
        status: "active",
      })
      .where(eq(projectWikiSections.id, rev.sectionId));

    await tx
      .update(projectWikiRevisions)
      .set({
        reviewState: "approved",
        appliedAt: new Date(),
      })
      .where(eq(projectWikiRevisions.id, revisionId));
  });
}

export async function rejectRevision(revisionId: number): Promise<void> {
  await db
    .update(projectWikiRevisions)
    .set({ reviewState: "rejected" })
    .where(eq(projectWikiRevisions.id, revisionId));
}

export async function listSections(
  projectId: number,
  filters: { kind?: string; status?: string } = {},
): Promise<WikiSectionRow[]> {
  const conditions = [eq(projectWikiSections.projectId, projectId)];
  if (filters.kind) conditions.push(eq(projectWikiSections.kind, filters.kind));
  if (filters.status)
    conditions.push(eq(projectWikiSections.status, filters.status));

  return db
    .select()
    .from(projectWikiSections)
    .where(and(...conditions))
    .orderBy(
      sql`CASE ${projectWikiSections.kind}
        WHEN 'glossary' THEN 0
        WHEN 'stakeholders' THEN 1
        WHEN 'decisions' THEN 2
        WHEN 'recurring_blockers' THEN 3
        WHEN 'communication_patterns' THEN 4
        WHEN 'observations' THEN 5
        ELSE 99 END`,
      desc(projectWikiSections.updatedAt),
    );
}

export async function listPendingRevisions(projectId: number) {
  return db
    .select({
      revision: projectWikiRevisions,
      section: projectWikiSections,
    })
    .from(projectWikiRevisions)
    .innerJoin(
      projectWikiSections,
      eq(projectWikiRevisions.sectionId, projectWikiSections.id),
    )
    .where(
      and(
        eq(projectWikiSections.projectId, projectId),
        eq(projectWikiRevisions.reviewState, "pending"),
      ),
    )
    .orderBy(desc(projectWikiRevisions.createdAt));
}
