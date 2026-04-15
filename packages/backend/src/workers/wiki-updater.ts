import { eq, inArray } from "drizzle-orm";
import { zodResponseFormat } from "openai/helpers/zod";
import { db } from "../db";
import {
  messages,
  projects,
  tasks,
  projectWikiSections,
} from "../db/schema";
import { getQueue } from "../queue";
import { JobTypes, type WikiUpdateJob } from "../queue/jobs";
import { DEFAULT_MODEL, llmChatCompletionsCreate } from "../services/llm";
import {
  buildWikiUpdatePrompt,
  WikiUpdateProposalSchema,
  wikiUpdateSystemPrompt,
  type WikiUpdateProposal,
} from "../prompts/wiki-update";
import {
  createPendingRevision,
  isWikiKind,
  upsertSectionWithRevision,
  type WikiKind,
} from "../services/wiki";
import { env } from "../config/env";

// Kinds that may be edited automatically by the LLM when confidence is high.
// Everything else is queued for manual review.
const AUTO_KINDS: ReadonlySet<WikiKind> = new Set([
  "observations",
  "communication_patterns",
  "recurring_blockers",
]);

const ACTOR = "llm-wiki-updater";

export async function registerWikiUpdater(): Promise<void> {
  const queue = await getQueue();

  await queue.work<WikiUpdateJob>(JobTypes.WIKI_UPDATE, async (jobs) => {
    for (const job of jobs) {
      try {
        if (!env.WIKI_ENABLED) {
          console.log("[WikiUpdater] WIKI_ENABLED=false, skipping job");
          continue;
        }

        const { projectId, messageIds, newTaskIds } = job.data;
        console.log(
          `[WikiUpdater] Processing job: project=${projectId}, messages=${messageIds.length}, newTasks=${newTaskIds.length}`,
        );

        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
        });
        if (!project) {
          console.warn(`[WikiUpdater] Project ${projectId} not found`);
          continue;
        }

        const messageBatch =
          messageIds.length > 0
            ? await db
                .select()
                .from(messages)
                .where(inArray(messages.id, messageIds))
                .orderBy(messages.fonnteDate)
            : [];

        if (messageBatch.length === 0) {
          console.log("[WikiUpdater] No messages to process, skipping");
          continue;
        }

        const newTasks =
          newTaskIds.length > 0
            ? await db
                .select({ id: tasks.id, description: tasks.description })
                .from(tasks)
                .where(inArray(tasks.id, newTaskIds))
            : [];

        const existingSections = await db
          .select()
          .from(projectWikiSections)
          .where(eq(projectWikiSections.projectId, projectId));

        const userPrompt = buildWikiUpdatePrompt({
          projectName: project.name,
          projectDescription: project.description,
          existingSections,
          messages: messageBatch.map((m) => ({
            id: m.id,
            sender: m.pushName,
            text: m.messageText,
            timestamp: m.fonnteDate,
          })),
          newlyExtractedTasks: newTasks,
        });

        const response = await llmChatCompletionsCreate({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: wikiUpdateSystemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: zodResponseFormat(
            WikiUpdateProposalSchema,
            "wiki_update",
          ),
          temperature: 0.2,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          console.warn("[WikiUpdater] Empty LLM response");
          continue;
        }

        const parsed = WikiUpdateProposalSchema.parse(JSON.parse(content));
        const proposals = parsed.proposals;
        console.log(
          `[WikiUpdater] LLM returned ${proposals.length} proposals`,
        );

        let autoApplied = 0;
        let pending = 0;
        const validMessageIds = new Set(messageIds);

        for (const proposal of proposals) {
          if (!isWikiKind(proposal.kind)) {
            console.warn(
              `[WikiUpdater] Skipping proposal with unknown kind: ${proposal.kind}`,
            );
            continue;
          }

          // Require at least one source message ID to belong to this batch.
          const sources = proposal.sourceMessageIds.filter((id) =>
            validMessageIds.has(id),
          );
          if (sources.length === 0) {
            console.warn(
              `[WikiUpdater] Rejecting proposal without valid source message IDs: ${proposal.title}`,
            );
            continue;
          }

          await routeProposal(projectId, { ...proposal, sourceMessageIds: sources }).then(
            (result) => {
              if (result === "auto_applied") autoApplied++;
              else pending++;
            },
          );
        }

        console.log(
          `[WikiUpdater] Summary project=${projectId}: auto_applied=${autoApplied}, pending=${pending}`,
        );
      } catch (error) {
        console.error("[WikiUpdater] Error processing job:", error);
        // Do NOT rethrow — wiki failures must never block downstream work.
      }
    }
  });

  console.log("[WikiUpdater] Worker registered");
}

async function routeProposal(
  projectId: number,
  proposal: WikiUpdateProposal,
): Promise<"auto_applied" | "pending"> {
  const kind = proposal.kind as WikiKind;
  const passesConfidence =
    proposal.confidence >= env.WIKI_AUTOEDIT_CONFIDENCE_THRESHOLD;
  const autoKind = AUTO_KINDS.has(kind);

  if (proposal.operation === "archive") {
    // Archive always requires review — too destructive to auto-apply.
    await createPendingRevision({
      projectId,
      kind,
      title: proposal.title,
      proposedContent: proposal.newContent,
      sourceMessageIds: proposal.sourceMessageIds,
      confidence: proposal.confidence,
      diffSummary: `archive requested: ${proposal.diffSummary ?? ""}`,
      actor: ACTOR,
    });
    return "pending";
  }

  if (autoKind && passesConfidence) {
    await upsertSectionWithRevision({
      projectId,
      kind,
      title: proposal.title,
      content: proposal.newContent,
      sourceMessageIds: proposal.sourceMessageIds,
      confidence: proposal.confidence,
      actor: ACTOR,
      reviewState: "auto_applied",
    });
    return "auto_applied";
  }

  await createPendingRevision({
    projectId,
    kind,
    title: proposal.title,
    proposedContent: proposal.newContent,
    sourceMessageIds: proposal.sourceMessageIds,
    confidence: proposal.confidence,
    diffSummary: proposal.diffSummary,
    actor: ACTOR,
  });
  return "pending";
}
