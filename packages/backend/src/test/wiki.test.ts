import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Mock env BEFORE importing modules that read it. `WIKI_ENABLED` must be true
// for `selectWikiSections` to return rows; other constants mirror defaults.
vi.mock("../config/env", async () => {
  const actual = await vi.importActual<typeof import("../config/env")>(
    "../config/env",
  );
  return {
    ...actual,
    env: {
      ...actual.env,
      WIKI_ENABLED: true,
      WIKI_MAX_TOKENS: 120,
      WIKI_AUTOEDIT_CONFIDENCE_THRESHOLD: 0.8,
    },
  };
});

import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  projectWikiRevisions,
  projectWikiSections,
  projects,
} from "../db/schema";
import {
  applyRevision,
  createPendingRevision,
  estimateTokens,
  formatSectionsForPrompt,
  isWikiKind,
  rejectRevision,
  selectWikiSections,
  upsertSectionWithRevision,
  WIKI_KINDS,
  type WikiKind,
} from "../services/wiki";

describe("wiki service", () => {
  describe("pure functions", () => {
    it("estimateTokens returns 0 for empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("estimateTokens approximates 4 chars per token", () => {
      expect(estimateTokens("abcd")).toBe(1);
      expect(estimateTokens("abcdefgh")).toBe(2);
      expect(estimateTokens("a".repeat(400))).toBe(100);
    });

    it("isWikiKind accepts known kinds and rejects unknown", () => {
      for (const k of WIKI_KINDS) expect(isWikiKind(k)).toBe(true);
      expect(isWikiKind("random")).toBe(false);
      expect(isWikiKind("")).toBe(false);
    });

    it("formatSectionsForPrompt returns null for empty input", () => {
      expect(formatSectionsForPrompt([])).toBeNull();
    });

    it("formatSectionsForPrompt groups by kind in priority order", () => {
      const now = new Date();
      const mkSection = (
        id: number,
        kind: WikiKind,
        title: string,
        content: string,
      ) => ({
        id,
        projectId: 1,
        kind,
        title,
        content,
        tokenEstimate: estimateTokens(content),
        sourceMessageIds: [],
        confidence: 1,
        status: "active",
        createdBy: "llm",
        updatedBy: "llm",
        createdAt: now,
        updatedAt: now,
      });

      // Intentionally scrambled input order.
      const sections = [
        mkSection(1, "observations", "Slow replies", "Design team replies slowly after 4pm"),
        mkSection(2, "glossary", "EOD", "EOD means 18:00 Jakarta time"),
        mkSection(3, "stakeholders", "Bu Ratna", "Prefers WA voice notes"),
      ];

      const out = formatSectionsForPrompt(sections)!;
      expect(out).toContain("### Glossary");
      expect(out).toContain("### Stakeholders");
      expect(out).toContain("### Observations");

      // Glossary must appear before Stakeholders, Stakeholders before Observations.
      const posGlossary = out.indexOf("### Glossary");
      const posStakeholders = out.indexOf("### Stakeholders");
      const posObservations = out.indexOf("### Observations");
      expect(posGlossary).toBeLessThan(posStakeholders);
      expect(posStakeholders).toBeLessThan(posObservations);

      // Section titles and content must be rendered.
      expect(out).toContain("**EOD**: EOD means 18:00 Jakarta time");
      expect(out).toContain("**Bu Ratna**: Prefers WA voice notes");
    });
  });

  describe("DB-backed", () => {
    let projectId: number;
    // Projects created by individual `it` blocks. Registered here so
    // `afterEach` can always delete them, even if assertions threw.
    const scopedProjectIds: number[] = [];

    async function createScopedProject(name: string): Promise<number> {
      const [p] = await db
        .insert(projects)
        .values({ name, healthScore: 100 })
        .returning();
      scopedProjectIds.push(p.id);
      return p.id;
    }

    beforeAll(async () => {
      const [p] = await db
        .insert(projects)
        .values({ name: "Wiki Test Project", healthScore: 100 })
        .returning();
      projectId = p.id;
    });

    afterEach(async () => {
      if (scopedProjectIds.length > 0) {
        await db
          .delete(projects)
          .where(inArray(projects.id, [...scopedProjectIds]));
        scopedProjectIds.length = 0;
      }
    });

    afterAll(async () => {
      // Cascade will clean sections + revisions.
      await db.delete(projects).where(eq(projects.id, projectId));
    });

    it("upsertSectionWithRevision creates section + revision, then updates on second call", async () => {
      const first = await upsertSectionWithRevision({
        projectId,
        kind: "observations",
        title: "Test obs",
        content: "Initial content",
        sourceMessageIds: [],
        confidence: 0.9,
        actor: "test",
        reviewState: "auto_applied",
      });
      expect(first.operation).toBe("created");

      const [row1] = await db
        .select()
        .from(projectWikiSections)
        .where(eq(projectWikiSections.id, first.sectionId));
      expect(row1.content).toBe("Initial content");
      expect(row1.tokenEstimate).toBeGreaterThan(0);
      expect(row1.status).toBe("active");

      const second = await upsertSectionWithRevision({
        projectId,
        kind: "observations",
        title: "Test obs",
        content: "Updated content with more detail",
        sourceMessageIds: [],
        confidence: 0.95,
        actor: "test",
        reviewState: "auto_applied",
      });
      expect(second.operation).toBe("updated");
      expect(second.sectionId).toBe(first.sectionId);

      const [row2] = await db
        .select()
        .from(projectWikiSections)
        .where(eq(projectWikiSections.id, first.sectionId));
      expect(row2.content).toBe("Updated content with more detail");

      // Two revisions should exist now.
      const revs = await db
        .select()
        .from(projectWikiRevisions)
        .where(eq(projectWikiRevisions.sectionId, first.sectionId));
      expect(revs.length).toBe(2);
      expect(revs.every((r) => r.reviewState === "auto_applied")).toBe(true);
    });

    it("upsertSectionWithRevision returns noop when content is unchanged", async () => {
      const a = await upsertSectionWithRevision({
        projectId,
        kind: "observations",
        title: "Noop case",
        content: "stable",
        sourceMessageIds: [],
        confidence: 0.9,
        actor: "test",
        reviewState: "auto_applied",
      });
      expect(a.operation).toBe("created");

      const b = await upsertSectionWithRevision({
        projectId,
        kind: "observations",
        title: "Noop case",
        content: "stable",
        sourceMessageIds: [],
        confidence: 0.9,
        actor: "test",
        reviewState: "auto_applied",
      });
      expect(b.operation).toBe("noop");
    });

    it("createPendingRevision creates placeholder section with status=pending_review", async () => {
      const result = await createPendingRevision({
        projectId,
        kind: "decisions",
        title: "Scope freeze",
        proposedContent: "We will freeze scope on 2026-04-01",
        sourceMessageIds: [],
        confidence: 0.9,
        diffSummary: "new decision",
        actor: "llm-wiki-updater",
      });

      const [section] = await db
        .select()
        .from(projectWikiSections)
        .where(eq(projectWikiSections.id, result.sectionId));
      expect(section.status).toBe("pending_review");
      // Pending sections must not leak into active content.
      expect(section.content).toBe("");

      const [rev] = await db
        .select()
        .from(projectWikiRevisions)
        .where(eq(projectWikiRevisions.id, result.revisionId));
      expect(rev.reviewState).toBe("pending");
      expect(rev.newContent).toBe("We will freeze scope on 2026-04-01");
    });

    it("applyRevision promotes pending revision to active section", async () => {
      const pending = await createPendingRevision({
        projectId,
        kind: "glossary",
        title: "Cutover",
        proposedContent: "Cutover = go-live switchover window",
        sourceMessageIds: [],
        confidence: 0.9,
        diffSummary: null,
        actor: "llm-wiki-updater",
      });

      await applyRevision(pending.revisionId, "user:1");

      const [section] = await db
        .select()
        .from(projectWikiSections)
        .where(eq(projectWikiSections.id, pending.sectionId));
      expect(section.status).toBe("active");
      expect(section.content).toBe("Cutover = go-live switchover window");
      expect(section.tokenEstimate).toBeGreaterThan(0);

      const [rev] = await db
        .select()
        .from(projectWikiRevisions)
        .where(eq(projectWikiRevisions.id, pending.revisionId));
      expect(rev.reviewState).toBe("approved");
      expect(rev.appliedAt).not.toBeNull();
    });

    it("rejectRevision marks revision rejected without touching section", async () => {
      const pending = await createPendingRevision({
        projectId,
        kind: "stakeholders",
        title: "Mr Doubtful",
        proposedContent: "unreliable assertion",
        sourceMessageIds: [],
        confidence: 0.5,
        diffSummary: null,
        actor: "llm-wiki-updater",
      });

      const [beforeSection] = await db
        .select()
        .from(projectWikiSections)
        .where(eq(projectWikiSections.id, pending.sectionId));

      await rejectRevision(pending.revisionId);

      const [rev] = await db
        .select()
        .from(projectWikiRevisions)
        .where(eq(projectWikiRevisions.id, pending.revisionId));
      expect(rev.reviewState).toBe("rejected");

      const [afterSection] = await db
        .select()
        .from(projectWikiSections)
        .where(eq(projectWikiSections.id, pending.sectionId));
      expect(afterSection.content).toBe(beforeSection.content);
      expect(afterSection.status).toBe(beforeSection.status);
    });

    it("selectWikiSections orders by kind priority and respects token budget", async () => {
      const scopedId = await createScopedProject("Wiki Budget Project");

      const seeds: Array<{ kind: WikiKind; title: string; content: string }> = [
        { kind: "observations", title: "obs-1", content: "x".repeat(200) },
        { kind: "glossary", title: "glo-1", content: "y".repeat(100) },
        { kind: "stakeholders", title: "sta-1", content: "z".repeat(120) },
        { kind: "observations", title: "obs-2", content: "w".repeat(80) },
      ];
      for (const s of seeds) {
        await upsertSectionWithRevision({
          projectId: scopedId,
          ...s,
          sourceMessageIds: [],
          confidence: 0.9,
          actor: "test",
          reviewState: "auto_applied",
        });
      }

      // Budget = 120 tokens. Greedy pack:
      //   - kind priority: glossary → stakeholders → observations
      //   - within observations: updatedAt DESC (obs-2 inserted after obs-1 → newer first)
      //
      //   glo-1  25 tokens → selected   (25)
      //   sta-1  30 tokens → selected   (55)
      //   obs-2  20 tokens → selected   (75)   (newer observation comes first)
      //   obs-1  50 tokens → SKIPPED    (75+50=125 > 120)
      const picked = await selectWikiSections(scopedId, 120);
      const titles = picked.map((p) => p.title);
      expect(titles).toEqual(["glo-1", "sta-1", "obs-2"]);
      expect(picked[0].kind).toBe("glossary");
      expect(picked[1].kind).toBe("stakeholders");
      expect(picked[2].kind).toBe("observations");
    });

    it("selectWikiSections ignores non-active sections", async () => {
      const scopedId = await createScopedProject("Wiki Inactive Project");

      await upsertSectionWithRevision({
        projectId: scopedId,
        kind: "glossary",
        title: "active one",
        content: "visible",
        sourceMessageIds: [],
        confidence: 0.9,
        actor: "test",
        reviewState: "auto_applied",
      });
      await createPendingRevision({
        projectId: scopedId,
        kind: "decisions",
        title: "pending one",
        proposedContent: "hidden",
        sourceMessageIds: [],
        confidence: 0.9,
        diffSummary: null,
        actor: "test",
      });

      const picked = await selectWikiSections(scopedId, 1000);
      const titles = picked.map((p) => p.title);
      expect(titles).toContain("active one");
      expect(titles).not.toContain("pending one");
    });
  });
});
