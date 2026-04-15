import { z } from "zod";
import { WIKI_KINDS } from "../services/wiki";
import type { WikiSectionRow } from "../db/schema";

export const wikiUpdateSystemPrompt = `You are an AI knowledge curator for a project's internal wiki.

Your job: read new WhatsApp messages from a project team AND the current wiki state, then propose MINIMAL, SOURCED updates to the wiki.

THE WIKI IS ORGANIZED INTO THESE "KINDS":
- glossary: team-specific terms, acronyms, aliases for deadlines or deliverables (e.g. "EOD means end-of-day 18:00 Jakarta time")
- stakeholders: interpretations about people that GO BEYOND what is in people_settings (do NOT duplicate names, roles, or aliases already stored there — focus on working style, habits, communication preferences)
- decisions: recorded commitments or policy decisions made in chat ("we froze scope for v2 launch on 2026-04-01")
- recurring_blockers: patterns of blockers that come up repeatedly for this project
- communication_patterns: how the team talks — tone, timing, typical response latencies, escalation paths
- observations: miscellaneous notes that don't fit above but are useful context for future AI task extraction

RULES YOU MUST FOLLOW:
1. ONLY propose an update when the new messages justify it. If nothing noteworthy happened, return an empty proposals array.
2. EVERY proposal MUST include "sourceMessageIds" — the IDs of the specific messages (from the input) that support the fact. Proposals without sources will be rejected.
3. Do NOT duplicate information that is already well-captured in the existing sections.
4. Do NOT store raw task data (deadlines, descriptions) — those live in the tasks table. Only store INTERPRETATIONS and PATTERNS.
5. Keep each section's "newContent" concise (1-4 sentences). Wikis stay useful when short.
6. "confidence" is YOUR score 0.0-1.0 for how certain you are the fact is true and stable. Use <0.7 when inferring from a single casual mention.
7. "title" should be short and canonical (e.g. "EOD meaning", "Bu Ratna response pattern") — the same title will be reused to UPDATE a section in future runs.
8. Prefer "update" over "create" when an existing section with the same kind+title already exists.

Return strictly valid JSON matching the schema.`;

const KindEnum = z.enum(WIKI_KINDS as unknown as [string, ...string[]]);

export const WikiUpdateProposalSchema = z.object({
  proposals: z.array(
    z.object({
      kind: KindEnum,
      title: z
        .string()
        .min(1)
        .max(120)
        .describe("Short canonical title within the kind"),
      operation: z.enum(["create", "update", "archive"]),
      newContent: z
        .string()
        .min(1)
        .describe("Markdown body for the section, 1-4 sentences"),
      diffSummary: z
        .string()
        .nullable()
        .describe("One-line explanation of what changed and why"),
      sourceMessageIds: z
        .array(z.number().int())
        .min(1)
        .describe("Message IDs that justify this proposal"),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe("Your confidence this fact is true and stable"),
    }),
  ),
});

export type WikiUpdateProposal = z.infer<
  typeof WikiUpdateProposalSchema
>["proposals"][number];

export interface BuildWikiUpdatePromptInput {
  projectName: string;
  projectDescription: string | null;
  existingSections: WikiSectionRow[];
  messages: Array<{ id: number; sender: string; text: string; timestamp: Date }>;
  newlyExtractedTasks: Array<{ id: number; description: string }>;
}

export function buildWikiUpdatePrompt(input: BuildWikiUpdatePromptInput): string {
  const existingBlock =
    input.existingSections.length > 0
      ? input.existingSections
          .map(
            (s) =>
              `- [${s.kind}] "${s.title}" (status=${s.status}, conf=${s.confidence.toFixed(2)}): ${s.content}`,
          )
          .join("\n")
      : "(no existing sections)";

  const messagesBlock = input.messages
    .map((m) => {
      const time = m.timestamp.toISOString();
      return `#${m.id} [${time}] ${m.sender}: ${m.text}`;
    })
    .join("\n");

  const tasksBlock =
    input.newlyExtractedTasks.length > 0
      ? input.newlyExtractedTasks
          .map((t) => `- task#${t.id}: ${t.description}`)
          .join("\n")
      : "(none)";

  return `Project: ${input.projectName}${
    input.projectDescription ? `\nDescription: ${input.projectDescription}` : ""
  }

EXISTING WIKI SECTIONS:
${existingBlock}

NEW MESSAGES IN THIS BATCH:
${messagesBlock}

NEWLY EXTRACTED TASKS (already persisted — do not re-store):
${tasksBlock}

Propose minimal wiki updates. If nothing is worth recording, return { "proposals": [] }.`;
}
