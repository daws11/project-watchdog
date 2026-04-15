import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { apiFetch } from "../api/client";

type WikiKind =
  | "glossary"
  | "stakeholders"
  | "decisions"
  | "recurring_blockers"
  | "communication_patterns"
  | "observations";

interface WikiGraphNode {
  id: number;
  kind: WikiKind;
  title: string;
  content: string;
  tokenEstimate: number;
  confidence: number;
  updatedAt: string;
  degree: number;
  // Force-graph-injected simulation fields (readonly for our code).
  x?: number;
  y?: number;
}

interface WikiGraphLink {
  source: number | WikiGraphNode;
  target: number | WikiGraphNode;
  weight: number;
}

interface WikiGraphResponse {
  nodes: WikiGraphNode[];
  links: WikiGraphLink[];
}

interface WikiProject {
  id: number;
  name: string;
  sectionCount: number;
  activeSectionCount: number;
}

// Obsidian-like palette — one hue per kind.
const KIND_COLORS: Record<WikiKind, string> = {
  glossary: "#38bdf8", // sky-400
  stakeholders: "#a78bfa", // violet-400
  decisions: "#f472b6", // pink-400
  recurring_blockers: "#fb923c", // orange-400
  communication_patterns: "#34d399", // emerald-400
  observations: "#facc15", // yellow-400
};

const KIND_LABELS: Record<WikiKind, string> = {
  glossary: "Glossary",
  stakeholders: "Stakeholders",
  decisions: "Decisions",
  recurring_blockers: "Recurring Blockers",
  communication_patterns: "Communication Patterns",
  observations: "Observations",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WikiGraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<WikiGraphNode, WikiGraphLink> | undefined>(undefined);
  const [projects, setProjects] = useState<WikiProject[] | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [graph, setGraph] = useState<WikiGraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WikiGraphNode | null>(null);
  const [hovered, setHovered] = useState<WikiGraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Load projects with wiki content for the dropdown.
  useEffect(() => {
    apiFetch<{ projects: WikiProject[] }>("/api/wiki/projects")
      .then((res) => {
        setProjects(res.projects);
        const firstWithSections = res.projects.find((p) => p.activeSectionCount > 0);
        if (firstWithSections) setProjectId(firstWithSections.id);
        else if (res.projects[0]) setProjectId(res.projects[0].id);
      })
      .catch((err) => setError((err as Error).message ?? "Failed to load projects"));
  }, []);

  // Load graph for the selected project.
  useEffect(() => {
    if (projectId == null) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    apiFetch<WikiGraphResponse>(`/api/wiki/${projectId}/graph`)
      .then((data) => setGraph(data))
      .catch((err) => setError((err as Error).message ?? "Failed to load graph"))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Track container size so the canvas fills available space.
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Zoom to fit after graph loads.
  useEffect(() => {
    if (graph && graphRef.current) {
      // Wait a tick for the simulation to run a few steps.
      const t = setTimeout(() => {
        graphRef.current?.zoomToFit(400, 60);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [graph, projectId]);

  // Force graph mutates link.source/target from IDs → node refs in place.
  // We keep the payload stable across renders to avoid re-running the layout.
  const graphData = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    return graph;
  }, [graph]);

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!graph) return counts;
    for (const n of graph.nodes) counts[n.kind] = (counts[n.kind] ?? 0) + 1;
    return counts;
  }, [graph]);

  const paintNode = (
    node: WikiGraphNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => {
    const isFocused =
      (selected && selected.id === node.id) ||
      (hovered && hovered.id === node.id);
    const baseRadius = 5 + Math.min(node.degree, 8) * 0.9;
    const radius = isFocused ? baseRadius + 2 : baseRadius;
    const color = KIND_COLORS[node.kind] ?? "#94a3b8";

    // Halo on focus.
    if (isFocused) {
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, radius + 5, 0, 2 * Math.PI, false);
      ctx.fillStyle = `${color}44`;
      ctx.fill();
    }

    // Node circle.
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.4 / globalScale;
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();

    // Label — always visible, rendered in world units scaled inversely to
    // the camera so on-screen size stays roughly constant at any zoom.
    // Pill-style background guarantees contrast on both light and dark canvas.
    const label = node.title.length > 32 ? `${node.title.slice(0, 31)}…` : node.title;
    const fontPx = 12 / globalScale;
    ctx.font = `600 ${fontPx}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const metrics = ctx.measureText(label);
    const padX = 5 / globalScale;
    const padY = 3 / globalScale;
    const boxW = metrics.width + padX * 2;
    const boxH = fontPx + padY * 2;
    const boxX = (node.x ?? 0) - boxW / 2;
    const boxY = (node.y ?? 0) + radius + 3 / globalScale;

    // Rounded pill background.
    const bgAlpha = isFocused ? 0.95 : 0.82;
    ctx.fillStyle = `rgba(15, 23, 42, ${bgAlpha})`;
    const r = Math.min(boxH / 2, 4 / globalScale);
    ctx.beginPath();
    ctx.moveTo(boxX + r, boxY);
    ctx.lineTo(boxX + boxW - r, boxY);
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
    ctx.lineTo(boxX + boxW, boxY + boxH - r);
    ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
    ctx.lineTo(boxX + r, boxY + boxH);
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
    ctx.lineTo(boxX, boxY + r);
    ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
    ctx.closePath();
    ctx.fill();

    if (isFocused) {
      ctx.lineWidth = 1 / globalScale;
      ctx.strokeStyle = color;
      ctx.stroke();
    }

    ctx.fillStyle = "#f8fafc";
    ctx.fillText(label, node.x ?? 0, boxY + padY);
  };

  const currentProject = projects?.find((p) => p.id === projectId);

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-8rem)]">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Wiki Graph
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Obsidian-style view of the LLM wiki knowledge per project. Each node is a
            wiki section; edges connect sections that share source messages.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Project:</span>
          <select
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={projectId ?? ""}
            onChange={(e) => setProjectId(Number(e.target.value))}
            disabled={!projects || projects.length === 0}
          >
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.activeSectionCount})
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-zinc-50 dark:bg-zinc-950"
        >
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500">
              {error}
            </div>
          )}
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
              Loading graph…
            </div>
          )}
          {!loading && !error && graph && graph.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500 text-center px-6">
              <div>
                No active wiki sections for this project yet.
                <br />
                Seed via <code className="font-mono">POST /api/wiki/:projectId/sections</code>.
              </div>
            </div>
          )}
          {!loading && !error && graph && graph.nodes.length > 0 && (
            <ForceGraph2D<WikiGraphNode, WikiGraphLink>
              ref={graphRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="rgba(0,0,0,0)"
              nodeId="id"
              nodeRelSize={6}
              nodeVal={(n) => 1 + (n.degree ?? 0)}
              nodeCanvasObject={paintNode}
              nodePointerAreaPaint={(node, color, ctx) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x ?? 0, node.y ?? 0, 10, 0, 2 * Math.PI, false);
                ctx.fill();
              }}
              linkColor={(link) =>
                selected &&
                (getId(link.source) === selected.id ||
                  getId(link.target) === selected.id)
                  ? "rgba(56, 189, 248, 0.85)"
                  : "rgba(148, 163, 184, 0.35)"
              }
              linkWidth={(link) => 0.5 + Math.min(link.weight, 6) * 0.4}
              cooldownTicks={120}
              onNodeClick={(node) => setSelected(node as WikiGraphNode)}
              onNodeHover={(node) => setHovered(node as WikiGraphNode | null)}
              onBackgroundClick={() => setSelected(null)}
            />
          )}

          {/* Legend */}
          {graph && graph.nodes.length > 0 && (
            <div className="absolute bottom-3 left-3 rounded-md border border-zinc-200 bg-white/90 p-2 text-xs shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
              <div className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">
                Legend
              </div>
              <ul className="space-y-1">
                {(Object.keys(KIND_COLORS) as WikiKind[]).map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: KIND_COLORS[k] }}
                    />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {KIND_LABELS[k]}
                    </span>
                    <span className="ml-auto text-zinc-400">
                      {kindCounts[k] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Details panel */}
        <aside className="w-80 shrink-0 border-l border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 overflow-y-auto">
          {selected ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: KIND_COLORS[selected.kind] }}
                />
                <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {KIND_LABELS[selected.kind]}
                </span>
              </div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {selected.title}
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {selected.content || <em className="text-zinc-400">(empty)</em>}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <dt>Confidence</dt>
                <dd className="text-right text-zinc-700 dark:text-zinc-300">
                  {selected.confidence.toFixed(2)}
                </dd>
                <dt>Tokens</dt>
                <dd className="text-right text-zinc-700 dark:text-zinc-300">
                  ~{selected.tokenEstimate}
                </dd>
                <dt>Connections</dt>
                <dd className="text-right text-zinc-700 dark:text-zinc-300">
                  {selected.degree}
                </dd>
                <dt>Updated</dt>
                <dd className="text-right text-zinc-700 dark:text-zinc-300">
                  {formatDate(selected.updatedAt)}
                </dd>
              </dl>
            </>
          ) : (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {currentProject ? (
                <>
                  <div className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">
                    {currentProject.name}
                  </div>
                  <p>
                    {graph?.nodes.length ?? 0} active sections ·{" "}
                    {graph?.links.length ?? 0} shared-message edges
                  </p>
                  <p className="mt-4">
                    Click a node to view the section content. Scroll to zoom,
                    drag to pan.
                  </p>
                </>
              ) : (
                <p>Select a project to view the graph.</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function getId(ref: number | WikiGraphNode): number {
  return typeof ref === "object" ? ref.id : ref;
}
