import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { connections, peopleSettings, projects } from "../db/schema";
import { llmChatCompletionsCreate, DEFAULT_MODEL } from "../services/llm";

/**
 * Context enrichment result from LLM analysis
 */
interface ContextEnrichmentResult {
  description: string | null;
  priorities: string | null;
  customContext: string | null;
}

/**
 * Analyzes recent messages and extracts context information using LLM.
 * Returns suggested context values for description, priorities, and custom context.
 */
async function analyzeMessagesForContext(
  messages: Array<{ sender: string; text: string }>,
  entityType: "project" | "connection" | "person",
  entityName: string,
): Promise<ContextEnrichmentResult> {
  if (messages.length === 0) {
    return { description: null, priorities: null, customContext: null };
  }

  const messagesText = messages
    .map((m) => `${m.sender}: ${m.text}`)
    .join("\n");

  const prompt = `Analyze the following ${entityType} messages and extract context information.

${entityType === "project" ? "Project" : entityType === "connection" ? "Group/Channel" : "Person"} Name: ${entityName}

Messages:
${messagesText}

Based on these messages, you MUST extract the following information. DO NOT return null unless the messages are completely empty or contain no meaningful information:

1. description (REQUIRED): A concise summary (1-2 sentences) describing what this ${entityType} is working on or discussing. Focus on the main topic, project, or purpose.

2. priorities (REQUIRED): Key focus areas, goals, or recurring themes mentioned in the messages. Return as a comma-separated list of 2-5 items. Extract specific technologies, tasks, or objectives being discussed.

3. customContext (optional): Any specific terminology, naming conventions, technical details, or important context that would help understand future messages. Include relevant tech stack, tools, or domain-specific information.

EXAMPLE RESPONSE:
{
  "description": "Development team working on payment gateway integration with Stripe and Midtrans",
  "priorities": "API documentation, webhook handling, security review, JWT authentication, sandbox testing",
  "customContext": "Using Stripe and Midtrans for payments. Webhook handling is critical. JWT tokens for authentication. Sandbox environment ready for testing."
}

CRITICAL: Always provide description and priorities. Only use null if the messages contain absolutely no work-related content. Return as JSON with fields: description, priorities, customContext.`;

  try {
    const response = await llmChatCompletionsCreate({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant that extracts entity context from conversations. Be concise and factual. Always extract meaningful context when messages contain work-related discussions. Never return null for description or priorities unless the input is completely empty.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { description: null, priorities: null, customContext: null };
    }

    const result = JSON.parse(content) as Partial<ContextEnrichmentResult>;

    return {
      description: result.description?.trim() || null,
      priorities: result.priorities?.trim() || null,
      customContext: result.customContext?.trim() || null,
    };
  } catch (error) {
    console.error(
      `[ContextEnricher] Error analyzing messages for ${entityType}:`,
      error,
    );
    return { description: null, priorities: null, customContext: null };
  }
}

/**
 * Enrich project context fields based on recent messages.
 * Only updates fields that are empty or were previously filled by AI (source='ai').
 * Fields marked as user-provided (source='user') are never overwritten.
 */
async function enrichProjectContext(
  projectId: number,
  messages: Array<{ sender: string; text: string }>,
): Promise<void> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    console.warn(`[ContextEnricher] Project not found: ${projectId}`);
    return;
  }

  // Check if any field needs enrichment (empty or AI-filled)
  const needsDescription =
    !project.description || project.descriptionSource === "ai";
  const needsPriorities =
    !project.priorities || project.prioritiesSource === "ai";
  const needsCustomPrompt =
    !project.customPrompt || project.customPromptSource === "ai";

  if (!needsDescription && !needsPriorities && !needsCustomPrompt) {
    console.log(
      `[ContextEnricher] Project ${projectId} has user-provided context, skipping enrichment`,
    );
    return;
  }

  const enrichment = await analyzeMessagesForContext(
    messages,
    "project",
    project.name,
  );

  // Build update values - only update empty fields or AI-filled fields
  const updateValues: Partial<typeof projects.$inferInsert> = {};

  if (needsDescription && enrichment.description) {
    updateValues.description = enrichment.description;
    updateValues.descriptionSource = "ai";
  }

  if (needsPriorities && enrichment.priorities) {
    updateValues.priorities = enrichment.priorities;
    updateValues.prioritiesSource = "ai";
  }

  if (needsCustomPrompt && enrichment.customContext) {
    updateValues.customPrompt = enrichment.customContext;
    updateValues.customPromptSource = "ai";
  }

  if (Object.keys(updateValues).length > 0) {
    await db.update(projects).set(updateValues).where(eq(projects.id, projectId));

    console.log(
      `[ContextEnricher] Enriched project ${projectId}:`,
      Object.keys(updateValues).filter((k) => !k.includes("Source")),
    );
  }
}

/**
 * Enrich connection (group) context fields based on recent messages.
 * Only updates fields that are empty or were previously filled by AI.
 */
async function enrichConnectionContext(
  connectionId: number,
  messages: Array<{ sender: string; text: string }>,
): Promise<void> {
  const connection = await db.query.connections.findFirst({
    where: eq(connections.id, connectionId),
  });

  if (!connection) {
    console.warn(`[ContextEnricher] Connection not found: ${connectionId}`);
    return;
  }

  // Check if any field needs enrichment
  const needsDescription =
    !connection.description || connection.descriptionSource === "ai";
  const needsPriorities =
    !connection.priorities || connection.prioritiesSource === "ai";
  const needsCustomPrompt =
    !connection.customPrompt || connection.customPromptSource === "ai";

  if (!needsDescription && !needsPriorities && !needsCustomPrompt) {
    console.log(
      `[ContextEnricher] Connection ${connectionId} has user-provided context, skipping enrichment`,
    );
    return;
  }

  const enrichment = await analyzeMessagesForContext(
    messages,
    "connection",
    connection.label,
  );

  // Build update values
  const updateValues: Partial<typeof connections.$inferInsert> = {};

  if (needsDescription && enrichment.description) {
    updateValues.description = enrichment.description;
    updateValues.descriptionSource = "ai";
  }

  if (needsPriorities && enrichment.priorities) {
    updateValues.priorities = enrichment.priorities;
    updateValues.prioritiesSource = "ai";
  }

  if (needsCustomPrompt && enrichment.customContext) {
    updateValues.customPrompt = enrichment.customContext;
    updateValues.customPromptSource = "ai";
  }

  if (Object.keys(updateValues).length > 0) {
    await db
      .update(connections)
      .set(updateValues)
      .where(eq(connections.id, connectionId));

    console.log(
      `[ContextEnricher] Enriched connection ${connectionId}:`,
      Object.keys(updateValues).filter((k) => !k.includes("Source")),
    );
  }
}

/**
 * Enrich person context fields based on messages they sent.
 * Only updates fields that are empty or were previously filled by AI.
 */
async function enrichPersonContext(
  personId: string,
  personName: string,
  messages: Array<{ sender: string; text: string }>,
): Promise<void> {
  // Check if any field needs enrichment
  const existingSettings = await db.query.peopleSettings.findFirst({
    where: eq(peopleSettings.personId, personId),
  });

  const needsRoleDescription =
    !existingSettings?.roleDescription ||
    existingSettings.roleDescriptionSource === "ai";
  const needsPriorities =
    !existingSettings?.priorities ||
    existingSettings.prioritiesSource === "ai";
  const needsCustomPrompt =
    !existingSettings?.customPrompt ||
    existingSettings.customPromptSource === "ai";

  if (!needsRoleDescription && !needsPriorities && !needsCustomPrompt) {
    console.log(
      `[ContextEnricher] Person ${personId} has user-provided context, skipping enrichment`,
    );
    return;
  }

  const enrichment = await analyzeMessagesForContext(
    messages,
    "person",
    personName,
  );

  // Build update values
  const updateValues: Partial<typeof peopleSettings.$inferInsert> = {};

  if (needsRoleDescription && enrichment.description) {
    updateValues.roleDescription = enrichment.description;
    updateValues.roleDescriptionSource = "ai";
  }

  if (needsPriorities && enrichment.priorities) {
    updateValues.priorities = enrichment.priorities;
    updateValues.prioritiesSource = "ai";
  }

  if (needsCustomPrompt && enrichment.customContext) {
    updateValues.customPrompt = enrichment.customContext;
    updateValues.customPromptSource = "ai";
  }

  if (Object.keys(updateValues).length > 0) {
    await db
      .insert(peopleSettings)
      .values({
        personId,
        ...updateValues,
      })
      .onConflictDoUpdate({
        target: peopleSettings.personId,
        set: {
          ...updateValues,
          updatedAt: new Date(),
        },
      });

    console.log(
      `[ContextEnricher] Enriched person ${personId}:`,
      Object.keys(updateValues).filter((k) => !k.includes("Source")),
    );
  }
}

/**
 * Main entry point for context enrichment.
 * Called after task extraction to enrich all related entities.
 *
 * @param projectId - The project ID
 * @param connectionId - The connection (group) ID
 * @param messages - Array of messages from the batch
 * @param senderNames - Array of unique sender names in the batch
 */
export async function enrichBatchContext(
  projectId: number,
  connectionId: number | null,
  messages: Array<{ sender: string; text: string }>,
  senderNames: string[],
): Promise<void> {
  console.log(
    `[ContextEnricher] Starting enrichment for project=${projectId}, connection=${connectionId}, senders=${senderNames.length}`,
  );

  try {
    // Enrich project context first (most important)
    await enrichProjectContext(projectId, messages);

    // Enrich connection context if available
    if (connectionId) {
      await enrichConnectionContext(connectionId, messages);
    }

    // Enrich each sender's person context - collect all promises
    const personEnrichmentPromises: Promise<void>[] = [];
    for (const senderName of senderNames) {
      // Create personId from sender name (same logic as people.ts)
      const personId = encodeURIComponent(senderName.trim().toLowerCase());

      // Get messages from this sender only
      const senderMessages = messages.filter(
        (m) =>
          m.sender.trim().toLowerCase() === senderName.trim().toLowerCase(),
      );

      if (senderMessages.length > 0) {
        personEnrichmentPromises.push(
          enrichPersonContext(personId, senderName, senderMessages),
        );
      }
    }

    // Wait for all person enrichments to complete
    if (personEnrichmentPromises.length > 0) {
      await Promise.all(personEnrichmentPromises);
    }

    console.log(`[ContextEnricher] Completed enrichment`);
  } catch (error) {
    console.error(`[ContextEnricher] Error during enrichment:`, error);
    // Don't throw - enrichment should not block task extraction
  }
}
