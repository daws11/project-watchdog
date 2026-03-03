import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  projects,
  connections,
  peopleSettings,
  messages,
  tasks,
} from "../../db/schema";
import { enrichBatchContext } from "../../workers/context-enricher";
import type { ContextEnrichmentScenario } from "../fixtures/context-enrichment-scenarios";

export interface EnrichmentTestResult {
  success: boolean;
  projectEnriched: boolean;
  connectionEnriched: boolean;
  peopleEnriched: string[];
  errors: string[];
}

export interface EnrichmentDetails {
  project: {
    description: string | null;
    priorities: string | null;
    customPrompt: string | null;
    descriptionSource: string | null;
    prioritiesSource: string | null;
    customPromptSource: string | null;
  } | null;
  connection: {
    description: string | null;
    priorities: string | null;
    customPrompt: string | null;
    descriptionSource: string | null;
    prioritiesSource: string | null;
    customPromptSource: string | null;
  } | null;
  people: Array<{
    personId: string;
    name: string | null;
    roleDescription: string | null;
    priorities: string | null;
    customPrompt: string | null;
    roleDescriptionSource: string | null;
    prioritiesSource: string | null;
    customPromptSource: string | null;
  }>;
}

/**
 * Seeds test data for context enrichment testing
 */
export async function seedContextEnrichmentScenario(
  scenario: ContextEnrichmentScenario,
  options: {
    projectId?: number;
    connectionId?: number;
    withUserProvidedContext?: boolean;
    runEnrichment?: boolean;
  } = {}
): Promise<{
  projectId: number;
  connectionId: number | null;
  messageIds: number[];
}> {
  // Create project if not provided
  let projectId: number;
  if (options.projectId) {
    projectId = options.projectId;
  } else {
    const [project] = await db
      .insert(projects)
      .values({
        name: `Test: ${scenario.name}`,
        description: options.withUserProvidedContext
          ? "User provided description"
          : null,
        descriptionSource: options.withUserProvidedContext ? "user" : "ai",
        priorities: options.withUserProvidedContext
          ? "User provided priorities"
          : null,
        prioritiesSource: options.withUserProvidedContext ? "user" : "ai",
        customPrompt: null,
        customPromptSource: "ai",
        healthScore: 100,
      })
      .returning();
    projectId = project.id;
  }

  // Create connection if requested
  let connectionId: number | null = null;
  if (options.connectionId) {
    connectionId = options.connectionId;
  } else if (scenario.messages.length > 0) {
    const [connection] = await db
      .insert(connections)
      .values({
        projectId,
        channelType: "whatsapp",
        label: `Test Group: ${scenario.name}`,
        identifier: `${Date.now()}@g.us`,
        description: options.withUserProvidedContext
          ? "User provided connection description"
          : null,
        descriptionSource: options.withUserProvidedContext ? "user" : "ai",
        priorities: null,
        prioritiesSource: "ai",
        customPrompt: null,
        customPromptSource: "ai",
        status: "active",
      })
      .returning();
    connectionId = connection.id;
  }

  // Create messages
  const messageIds: number[] = [];
  const uniqueSenders = [...new Set(scenario.messages.map((m) => m.sender))];

  for (const msg of scenario.messages) {
    const [message] = await db
      .insert(messages)
      .values({
        connectionId,
        projectId,
        sender: `628${Math.floor(Math.random() * 1000000000)}@c.us`,
        pushName: msg.sender,
        messageText: msg.text,
        messageHash: `hash-${Date.now()}-${Math.random()}`,
        isGroup: true,
        processed: false,
        fonnteDate: new Date(),
      })
      .returning();
    messageIds.push(message.id);
  }

  // Run enrichment if requested (for tests that need to inspect enriched data)
  if (options.runEnrichment) {
    const messagesForEnrichment = scenario.messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));
    await enrichBatchContext(projectId, connectionId, messagesForEnrichment, uniqueSenders);
  }

  return { projectId, connectionId, messageIds };
}

/**
 * Cleans up test data created by seedContextEnrichmentScenario
 */
export async function cleanupContextEnrichmentScenario(
  projectId: number,
  connectionId: number | null,
  messageIds: number[]
): Promise<void> {
  // Delete messages
  if (messageIds.length > 0) {
    await db.delete(messages).where(eq(messages.id, messageIds[0]));
  }

  // Delete tasks for this project
  await db.delete(tasks).where(eq(tasks.projectId, projectId));

  // Delete connection
  if (connectionId) {
    await db.delete(connections).where(eq(connections.id, connectionId));
  }

  // Delete project
  await db.delete(projects).where(eq(projects.id, projectId));
}

/**
 * Runs context enrichment and validates results
 */
export async function runContextEnrichmentTest(
  scenario: ContextEnrichmentScenario,
  options: {
    withUserProvidedContext?: boolean;
  } = {}
): Promise<EnrichmentTestResult> {
  const errors: string[] = [];

  try {
    // Seed test data
    const { projectId, connectionId, messageIds } =
      await seedContextEnrichmentScenario(scenario, options);

    // Prepare messages for enrichment
    const messages = scenario.messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    const uniqueSenders = [...new Set(scenario.messages.map((m) => m.sender))];

    // Run enrichment
    await enrichBatchContext(projectId, connectionId, messages, uniqueSenders);

    // Check results
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    const connection = connectionId
      ? await db.query.connections.findFirst({
          where: eq(connections.id, connectionId),
        })
      : null;

    // Check people enrichments
    const peopleEnriched: string[] = [];
    for (const sender of uniqueSenders) {
      const personId = encodeURIComponent(sender.trim().toLowerCase());
      const person = await db.query.peopleSettings.findFirst({
        where: eq(peopleSettings.personId, personId),
      });

      if (
        person &&
        (person.roleDescription || person.priorities || person.customPrompt)
      ) {
        peopleEnriched.push(sender);
      }
    }

    // Validate results
    const projectEnriched = !!(
      project?.description || project?.priorities || project?.customPrompt
    );
    const connectionEnriched = !!(
      connection?.description ||
      connection?.priorities ||
      connection?.customPrompt
    );

    // Cleanup
    await cleanupContextEnrichmentScenario(projectId, connectionId, messageIds);

    // Check expected patterns if not user-provided
    if (!options.withUserProvidedContext) {
      if (
        project?.description &&
        !scenario.expectedContext.descriptionPattern.test(project.description)
      ) {
        errors.push(
          `Project description doesn't match expected pattern: ${project.description}`
        );
      }
      if (
        project?.priorities &&
        !scenario.expectedContext.prioritiesPattern.test(project.priorities)
      ) {
        errors.push(
          `Project priorities don't match expected pattern: ${project.priorities}`
        );
      }
    }

    return {
      success: errors.length === 0,
      projectEnriched,
      connectionEnriched,
      peopleEnriched,
      errors,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return {
      success: false,
      projectEnriched: false,
      connectionEnriched: false,
      peopleEnriched: [],
      errors: [errorMessage],
    };
  }
}

/**
 * Gets detailed enrichment results for inspection
 */
export async function getEnrichmentDetails(
  projectId: number,
  connectionId: number | null,
  senderNames: string[]
): Promise<EnrichmentDetails> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  const connection = connectionId
    ? await db.query.connections.findFirst({
        where: eq(connections.id, connectionId),
      })
    : null;

  const people: EnrichmentDetails["people"] = [];
  for (const sender of senderNames) {
    const personId = encodeURIComponent(sender.trim().toLowerCase());
    const person = await db.query.peopleSettings.findFirst({
      where: eq(peopleSettings.personId, personId),
    });

    if (person) {
      people.push({
        personId: person.personId,
        name: person.name,
        roleDescription: person.roleDescription,
        priorities: person.priorities,
        customPrompt: person.customPrompt,
        roleDescriptionSource: person.roleDescriptionSource,
        prioritiesSource: person.prioritiesSource,
        customPromptSource: person.customPromptSource,
      });
    }
  }

  return {
    project: project
      ? {
          description: project.description,
          priorities: project.priorities,
          customPrompt: project.customPrompt,
          descriptionSource: project.descriptionSource,
          prioritiesSource: project.prioritiesSource,
          customPromptSource: project.customPromptSource,
        }
      : null,
    connection: connection
      ? {
          description: connection.description,
          priorities: connection.priorities,
          customPrompt: connection.customPrompt,
          descriptionSource: connection.descriptionSource,
          prioritiesSource: connection.prioritiesSource,
          customPromptSource: connection.customPromptSource,
        }
      : null,
    people,
  };
}

/**
 * Verifies user override protection is working
 */
export async function verifyUserOverrideProtection(
  projectId: number,
  connectionId: number | null,
  expectedUserFields: {
    project?: ("description" | "priorities" | "customPrompt")[];
    connection?: ("description" | "priorities" | "customPrompt")[];
  }
): Promise<{
  protected: boolean;
  violations: string[];
}> {
  const violations: string[] = [];

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  const connection = connectionId
    ? await db.query.connections.findFirst({
        where: eq(connections.id, connectionId),
      })
    : null;

  // Check project fields
  if (expectedUserFields.project) {
    for (const field of expectedUserFields.project) {
      const sourceField = `${field}Source` as const;
      const source = project?.[sourceField];
      if (source !== "user") {
        violations.push(
          `Project ${field} should have source='user' but found '${source}'`
        );
      }
    }
  }

  // Check connection fields
  if (expectedUserFields.connection && connection) {
    for (const field of expectedUserFields.connection) {
      const sourceField = `${field}Source` as const;
      const source = connection?.[sourceField];
      if (source !== "user") {
        violations.push(
          `Connection ${field} should have source='user' but found '${source}'`
        );
      }
    }
  }

  return {
    protected: violations.length === 0,
    violations,
  };
}

/**
 * Utility to wait for enrichment to complete (with retries)
 */
export async function waitForEnrichment(
  projectId: number,
  maxWaitMs: number = 30000,
  pollIntervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (
      project?.description ||
      project?.priorities ||
      project?.customPrompt
    ) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return false;
}

/**
 * Logs enrichment results for debugging
 */
export function logEnrichmentResult(
  scenarioName: string,
  result: EnrichmentTestResult,
  details?: EnrichmentDetails
): void {
  console.log(`\n[Context Enrichment Test: ${scenarioName}]`);
  console.log(`  Success: ${result.success}`);
  console.log(`  Project Enriched: ${result.projectEnriched}`);
  console.log(`  Connection Enriched: ${result.connectionEnriched}`);
  console.log(`  People Enriched: ${result.peopleEnriched.join(", ") || "None"}`);

  if (result.errors.length > 0) {
    console.log(`  Errors:`, result.errors);
  }

  if (details) {
    console.log(`  Details:`);
    if (details.project) {
      console.log(`    Project:`);
      console.log(
        `      Description: ${details.project.description?.slice(0, 50)}... (${details.project.descriptionSource})`
      );
      console.log(
        `      Priorities: ${details.project.priorities?.slice(0, 50)}... (${details.project.prioritiesSource})`
      );
    }
    if (details.connection) {
      console.log(`    Connection:`);
      console.log(
        `      Description: ${details.connection.description?.slice(0, 50)}... (${details.connection.descriptionSource})`
      );
    }
    if (details.people.length > 0) {
      console.log(`    People:`);
      for (const person of details.people) {
        console.log(
          `      ${person.name}: ${person.roleDescription?.slice(0, 30)}...`
        );
      }
    }
  }
}
