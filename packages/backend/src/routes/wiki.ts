import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  projects,
  projectWikiRevisions,
  projectWikiSections,
} from "../db/schema";
import {
  applyRevision,
  estimateTokens,
  isWikiKind,
  listPendingRevisions,
  listSections,
  rejectRevision,
  WIKI_KINDS,
} from "../services/wiki";

const router = Router();

// GET /api/wiki/projects — list projects that have wiki sections, for the
// graph page's project selector. Includes section/active counts.
router.get("/projects", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        sectionCount: sql<number>`count(${projectWikiSections.id})::int`,
        activeSectionCount: sql<number>`count(case when ${projectWikiSections.status} = 'active' then 1 end)::int`,
      })
      .from(projects)
      .leftJoin(
        projectWikiSections,
        eq(projectWikiSections.projectId, projects.id),
      )
      .groupBy(projects.id, projects.name)
      .orderBy(projects.name);
    res.json({ projects: rows });
  } catch (error) {
    console.error("[WikiRoutes] list projects error:", error);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

// GET /api/wiki/:projectId/graph — return Obsidian-style graph for a project.
// Nodes = active wiki sections. Links = pairs of sections whose
// source_message_ids overlap (weight = count of shared message ids).
router.get("/:projectId/graph", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }

    const sections = await db
      .select({
        id: projectWikiSections.id,
        kind: projectWikiSections.kind,
        title: projectWikiSections.title,
        content: projectWikiSections.content,
        tokenEstimate: projectWikiSections.tokenEstimate,
        sourceMessageIds: projectWikiSections.sourceMessageIds,
        confidence: projectWikiSections.confidence,
        status: projectWikiSections.status,
        updatedAt: projectWikiSections.updatedAt,
      })
      .from(projectWikiSections)
      .where(
        and(
          eq(projectWikiSections.projectId, projectId),
          eq(projectWikiSections.status, "active"),
        ),
      );

    const nodes = sections.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      content: s.content,
      tokenEstimate: s.tokenEstimate,
      confidence: s.confidence,
      updatedAt: s.updatedAt,
      degree: 0,
    }));

    // Compute overlaps via message-id inverted index for O(M*k^2) instead of
    // O(N^2 * avgSourceLen). For typical wiki sizes either is fine.
    const messageToSections = new Map<number, number[]>();
    for (const s of sections) {
      const ids = Array.isArray(s.sourceMessageIds)
        ? (s.sourceMessageIds as number[])
        : [];
      for (const mid of ids) {
        if (typeof mid !== "number") continue;
        const bucket = messageToSections.get(mid) ?? [];
        bucket.push(s.id);
        messageToSections.set(mid, bucket);
      }
    }

    // Pair -> shared message count.
    const pairKey = (a: number, b: number) =>
      a < b ? `${a}:${b}` : `${b}:${a}`;
    const pairCounts = new Map<string, number>();
    for (const bucket of messageToSections.values()) {
      if (bucket.length < 2) continue;
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const k = pairKey(bucket[i], bucket[j]);
          pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1);
        }
      }
    }

    const links: Array<{ source: number; target: number; weight: number }> = [];
    const degreeById = new Map<number, number>();
    for (const [key, weight] of pairCounts.entries()) {
      const [a, b] = key.split(":").map((n) => Number(n));
      links.push({ source: a, target: b, weight });
      degreeById.set(a, (degreeById.get(a) ?? 0) + 1);
      degreeById.set(b, (degreeById.get(b) ?? 0) + 1);
    }
    for (const n of nodes) {
      n.degree = degreeById.get(n.id) ?? 0;
    }

    res.json({ nodes, links });
  } catch (error) {
    console.error("[WikiRoutes] graph error:", error);
    res.status(500).json({ error: "Failed to compute wiki graph" });
  }
});

router.get("/:projectId/sections", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;

    const sections = await listSections(projectId, { kind, status });
    res.json({ sections });
  } catch (error) {
    console.error("[WikiRoutes] list sections error:", error);
    res.status(500).json({ error: "Failed to list sections" });
  }
});

router.get("/:projectId/pending-revisions", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }
    const rows = await listPendingRevisions(projectId);
    res.json({ revisions: rows });
  } catch (error) {
    console.error("[WikiRoutes] list pending error:", error);
    res.status(500).json({ error: "Failed to list pending revisions" });
  }
});

router.post("/:projectId/sections", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }
    const { kind, title, content, confidence } = req.body ?? {};
    if (!isWikiKind(kind)) {
      res
        .status(400)
        .json({ error: `Invalid kind. Allowed: ${WIKI_KINDS.join(", ")}` });
      return;
    }
    if (typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const actorId = req.user?.userId;
    const actor = actorId ? `user:${actorId}` : "user:unknown";
    const [row] = await db
      .insert(projectWikiSections)
      .values({
        projectId,
        kind,
        title: title.trim(),
        content,
        tokenEstimate: estimateTokens(content),
        sourceMessageIds: [],
        confidence: typeof confidence === "number" ? confidence : 1.0,
        status: "active",
        createdBy: actor,
        updatedBy: actor,
      })
      .returning();
    res.status(201).json({ section: row });
  } catch (error) {
    console.error("[WikiRoutes] create section error:", error);
    res.status(500).json({ error: "Failed to create section" });
  }
});

router.patch("/sections/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid section id" });
      return;
    }
    const { content, status, title } = req.body ?? {};
    const actorId = req.user?.userId;
    const actor = actorId ? `user:${actorId}` : "user:unknown";

    const [current] = await db
      .select()
      .from(projectWikiSections)
      .where(eq(projectWikiSections.id, id))
      .limit(1);
    if (!current) {
      res.status(404).json({ error: "Section not found" });
      return;
    }

    const nextContent = typeof content === "string" ? content : current.content;
    const nextTitle = typeof title === "string" ? title : current.title;
    const nextStatus = typeof status === "string" ? status : current.status;

    const [row] = await db
      .update(projectWikiSections)
      .set({
        content: nextContent,
        title: nextTitle,
        status: nextStatus,
        tokenEstimate: estimateTokens(nextContent),
        updatedBy: actor,
        updatedAt: new Date(),
      })
      .where(eq(projectWikiSections.id, id))
      .returning();

    if (current.content !== nextContent) {
      await db.insert(projectWikiRevisions).values({
        sectionId: id,
        previousContent: current.content,
        newContent: nextContent,
        diffSummary: "manual edit",
        sourceMessageIds: [],
        confidence: current.confidence,
        actor,
        reviewState: "approved",
        appliedAt: new Date(),
      });
    }

    res.json({ section: row });
  } catch (error) {
    console.error("[WikiRoutes] patch section error:", error);
    res.status(500).json({ error: "Failed to update section" });
  }
});

router.post("/revisions/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid revision id" });
      return;
    }
    const actorId = req.user?.userId;
    const actor = actorId ? `user:${actorId}` : "user:unknown";
    await applyRevision(id, actor);
    res.json({ ok: true });
  } catch (error) {
    console.error("[WikiRoutes] approve revision error:", error);
    res.status(500).json({ error: "Failed to approve revision" });
  }
});

router.post("/revisions/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid revision id" });
      return;
    }
    await rejectRevision(id);
    res.json({ ok: true });
  } catch (error) {
    console.error("[WikiRoutes] reject revision error:", error);
    res.status(500).json({ error: "Failed to reject revision" });
  }
});

export { router as wikiRouter };
