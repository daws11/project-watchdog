import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  connections,
  messages,
  projects,
  tasks,
} from "../../db/schema";
import { enqueueMessage } from "../../workers/message-processor";

export interface TestMessage {
  sender: string;
  pushName: string;
  text: string;
  offsetMinutes: number;
}

export interface TestScenario {
  name: string;
  projectName: string;
  projectDescription?: string;
  groupId: string;
  messages: TestMessage[];
  existingTasks?: string[];
  expectedTaskPatterns?: string[];
}

export interface SeededScenarioResult {
  projectId: number;
  connectionId: number;
  messageIds: number[];
}

/**
 * Setup test project if not exists
 */
export async function setupTestProject(
  name: string,
  description?: string,
): Promise<number> {
  // Check if project exists (using test prefix to identify)
  const testProjectName = `[TEST] ${name}`;
  const existing = await db
    .select()
    .from(projects)
    .where(eq(projects.name, testProjectName))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new test project
  const result = await db
    .insert(projects)
    .values({
      name: testProjectName,
      description: description || `Test project for ${name}`,
    })
    .returning();

  const projectId = result[0]?.id;
  if (!projectId) {
    throw new Error("Failed to create test project");
  }

  console.log(`[TestUtils] Created test project: ${testProjectName} (ID: ${projectId})`);
  return projectId;
}

/**
 * Setup test connection for a project
 */
export async function setupTestConnection(
  projectId: number,
  groupId: string,
): Promise<number> {
  // Check if connection exists
  const existing = await db
    .select()
    .from(connections)
    .where(eq(connections.identifier, groupId))
    .limit(1);

  if (existing.length > 0) {
    // Update to active if needed
    if (existing[0].status !== "active") {
      await db
        .update(connections)
        .set({ status: "active" })
        .where(eq(connections.id, existing[0].id));
    }
    return existing[0].id;
  }

  // Create new connection
  const result = await db
    .insert(connections)
    .values({
      projectId,
      channelType: "whatsapp",
      label: `Test Group ${groupId}`,
      identifier: groupId,
      status: "active",
    })
    .returning();

  const connectionId = result[0]?.id;
  if (!connectionId) {
    throw new Error("Failed to create test connection");
  }

  console.log(`[TestUtils] Created test connection: ${groupId} (ID: ${connectionId})`);
  return connectionId;
}

/**
 * Seed test scenario into database
 */
export async function seedTestScenario(
  scenario: TestScenario,
): Promise<SeededScenarioResult> {
  console.log(`[TestUtils] Seeding scenario: ${scenario.name}`);

  // 1. Setup project
  const projectId = await setupTestProject(
    scenario.projectName,
    scenario.projectDescription,
  );

  // 2. Setup connection
  const connectionId = await setupTestConnection(
    projectId,
    scenario.groupId,
  );

  // 3. Insert existing tasks if specified
  if (scenario.existingTasks && scenario.existingTasks.length > 0) {
    for (const taskDesc of scenario.existingTasks) {
      await db.insert(tasks).values({
        projectId,
        description: taskDesc,
        status: "open",
        confidence: 0.9,
      });
    }
    console.log(`[TestUtils] Inserted ${scenario.existingTasks.length} existing tasks`);
  }

  // 4. Insert messages and enqueue for processing
  const insertedIds: number[] = [];
  const baseTime = Date.now();

  for (const msg of scenario.messages) {
    const timestamp = new Date(baseTime - msg.offsetMinutes * 60 * 1000);
    const messageHash = `test-${scenario.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await db
      .insert(messages)
      .values({
        connectionId,
        projectId,
        sender: msg.sender,
        pushName: msg.pushName,
        messageText: msg.text,
        messageHash,
        isGroup: true,
        fonnteDate: timestamp,
        processed: false,
      })
      .returning();

    const messageId = result[0]?.id;
    if (!messageId) {
      throw new Error("Failed to insert test message");
    }

    insertedIds.push(messageId);

    // Enqueue for processing
    await enqueueMessage(connectionId, projectId, messageId);
  }

  console.log(
    `[TestUtils] Inserted ${insertedIds.length} messages and enqueued for processing`,
  );

  return {
    projectId,
    connectionId,
    messageIds: insertedIds,
  };
}

/**
 * Cleanup test data for a specific scenario
 */
export async function cleanupTestScenario(
  result: SeededScenarioResult,
): Promise<void> {
  console.log(`[TestUtils] Cleaning up test data for project ${result.projectId}`);

  // Delete tasks
  await db.delete(tasks).where(eq(tasks.projectId, result.projectId));

  // Delete messages
  await db
    .delete(messages)
    .where(eq(messages.connectionId, result.connectionId));

  // Delete connection
  await db
    .delete(connections)
    .where(eq(connections.id, result.connectionId));

  // Delete project
  await db.delete(projects).where(eq(projects.id, result.projectId));

  console.log(`[TestUtils] Cleanup complete`);
}

/**
 * Cleanup all test data (identified by [TEST] prefix)
 */
export async function cleanupAllTestData(): Promise<void> {
  console.log(`[TestUtils] Cleaning up ALL test data`);

  // Find all test projects
  const testProjects = await db
    .select()
    .from(projects)
    .where(sql`${projects.name} LIKE '[TEST] %'`);

  for (const project of testProjects) {
    // Delete associated data
    await db.delete(tasks).where(eq(tasks.projectId, project.id));
    await db.delete(messages).where(eq(messages.projectId, project.id));

    // Delete connections
    const conns = await db
      .select()
      .from(connections)
      .where(eq(connections.projectId, project.id));

    for (const conn of conns) {
      await db.delete(connections).where(eq(connections.id, conn.id));
    }

    // Delete project
    await db.delete(projects).where(eq(projects.id, project.id));
  }

  // Cleanup test connections by identifier pattern
  const testConns = await db
    .select()
    .from(connections)
    .where(sql`${connections.identifier} LIKE 'test-%'`);

  for (const conn of testConns) {
    await db.delete(messages).where(eq(messages.connectionId, conn.id));
    await db.delete(connections).where(eq(connections.id, conn.id));
  }

  console.log(`[TestUtils] Cleaned up ${testProjects.length} test projects`);
}
