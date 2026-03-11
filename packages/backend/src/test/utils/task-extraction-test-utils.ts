import { eq, inArray } from "drizzle-orm";
import { zodResponseFormat } from "openai/helpers/zod";
import { db } from "../../db";
import {
  projects,
  connections,
  messages,
  tasks,
  peopleSettings,
} from "../../db/schema";
import {
  taskExtractionSystemPrompt,
  DeadlineExtractionSchema,
  buildRichTaskExtractionPrompt,
  CONFIDENCE_THRESHOLD,
  deadlineParsingGuidelines,
} from "../../prompts/task-extraction";
import { llmChatCompletionsCreate, DEFAULT_MODEL } from "../../services/llm";
import type { TestScenario, TestMessage } from "./seed-messages";

export interface TaskExtractionTestResult {
  success: boolean;
  extractedTasks: Array<{
    description: string;
    assignee: string | null;
    deadline: string | null;
    confidence: number;
    sourceMessage?: string;
  }>;
  errors: string[];
  rawLLMResponse?: string;
  processingTimeMs: number;
  confidenceStats: {
    high: number; // >= 0.8
    medium: number; // 0.6-0.8
    low: number; // < 0.6
  };
}

export interface TaskValidationResult {
  valid: boolean;
  issues: string[];
  categoryMatches: Record<string, number>;
  peopleWithTasks: string[];
}

/**
 * Extracts tasks directly using LLM without going through the queue system
 * This allows for direct testing of LLM extraction quality
 */
export async function extractTasksWithLLM(
  messages: Array<{ sender: string; text: string; timestamp: Date }>,
  projectContext: {
    name: string;
    description: string | null;
    priorities: string | null;
    customPrompt: string | null;
  },
  connectionContext: {
    label: string;
    description: string | null;
    priorities: string | null;
    customPrompt: string | null;
  } | null,
  existingTaskDescriptions: string[] = [],
  peopleContext: Array<{
    name: string;
    roleName: string | null;
    roleDescription: string | null;
    priorities: string | null;
    customPrompt: string | null;
    aliases: string[];
  }> = []
): Promise<TaskExtractionTestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // Build the extraction prompt
    const userPrompt = buildRichTaskExtractionPrompt(
      projectContext,
      connectionContext,
      peopleContext,
      existingTaskDescriptions,
      messages
    );

    const fullSystemPrompt = taskExtractionSystemPrompt + deadlineParsingGuidelines;

    // Call LLM directly
    const response = await llmChatCompletionsCreate({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: zodResponseFormat(
        DeadlineExtractionSchema,
        "task_extraction"
      ),
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in LLM response");
    }

    // Parse response
    const result = JSON.parse(content);
    const extractedTasks = DeadlineExtractionSchema.parse(result);

    // Calculate confidence stats
    const confidenceStats = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const task of extractedTasks.tasks) {
      if (task.confidence >= 0.8) confidenceStats.high++;
      else if (task.confidence >= 0.6) confidenceStats.medium++;
      else confidenceStats.low++;
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      success: true,
      extractedTasks: extractedTasks.tasks.map((t) => ({
        description: t.description,
        assignee: t.assignee,
        deadline: t.deadline,
        confidence: t.confidence,
      })),
      errors,
      rawLLMResponse: content,
      processingTimeMs,
      confidenceStats,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return {
      success: false,
      extractedTasks: [],
      errors: [errorMessage],
      processingTimeMs: Date.now() - startTime,
      confidenceStats: { high: 0, medium: 0, low: 0 },
    };
  }
}

/**
 * Seeds test scenario and extracts tasks with real LLM
 */
export async function seedAndExtractTasks(
  scenario: TestScenario,
  options: {
    withExistingTasks?: boolean;
  } = {}
): Promise<{
  projectId: number;
  connectionId: number;
  messageIds: number[];
  extractionResult: TaskExtractionTestResult;
}> {
  // Create project
  const [project] = await db
    .insert(projects)
    .values({
      name: `Test: ${scenario.name}`,
      description: scenario.projectDescription,
      healthScore: 100,
    })
    .returning();

  // Create connection
  const [connection] = await db
    .insert(connections)
    .values({
      projectId: project.id,
      channelType: "whatsapp",
      label: `Test Group: ${scenario.groupId}`,
      identifier: scenario.groupId,
      status: "active",
    })
    .returning();

  // Create existing tasks if specified
  if (options.withExistingTasks && scenario.existingTasks) {
    for (const taskDesc of scenario.existingTasks) {
      await db.insert(tasks).values({
        projectId: project.id,
        description: taskDesc,
        status: "open",
        confidence: 0.9,
      });
    }
  }

  // Fetch existing tasks for context
  const existingTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, project.id));

  const existingTaskDescriptions = existingTasks.map((t) => t.description);

  // Prepare messages with timestamps
  const baseTime = new Date();
  const messagesForExtraction = scenario.messages.map((m, idx) => ({
    sender: m.pushName,
    text: m.text,
    timestamp: new Date(baseTime.getTime() - m.offsetMinutes * 60 * 1000 + idx * 1000),
  }));

  // Extract unique senders for people context
  const uniqueSenders = [
    ...new Set(scenario.messages.map((m) => m.pushName)),
  ];
  const peopleContext = uniqueSenders.map((name) => ({
    name,
  }));

  // Prepare people context with all required fields
  const enrichedPeopleContext = peopleContext.map(p => ({
    name: p.name,
    roleName: null as string | null,
    roleDescription: null as string | null,
    priorities: null as string | null,
    customPrompt: null as string | null,
    aliases: [] as string[],
  }));

  // Extract tasks with LLM
  const extractionResult = await extractTasksWithLLM(
    messagesForExtraction,
    {
      name: scenario.projectName,
      description: scenario.projectDescription ?? null,
      priorities: null,
      customPrompt: null,
    },
    {
      label: scenario.groupId,
      description: null,
      priorities: null,
      customPrompt: null,
    },
    existingTaskDescriptions,
    enrichedPeopleContext
  );

  // Store messages for reference
  const messageIds: number[] = [];
  for (const msg of scenario.messages) {
    const [message] = await db
      .insert(messages)
      .values({
        connectionId: connection.id,
        projectId: project.id,
        sender: msg.sender,
        pushName: msg.pushName,
        messageText: msg.text,
        messageHash: `test-${Date.now()}-${Math.random()}`,
        isGroup: true,
        processed: true,
        fonnteDate: new Date(Date.now() - msg.offsetMinutes * 60 * 1000),
      })
      .returning();
    messageIds.push(message.id);
  }

  // Store extracted tasks
  for (const task of extractionResult.extractedTasks) {
    if (task.confidence >= CONFIDENCE_THRESHOLD) {
      await db.insert(tasks).values({
        projectId: project.id,
        description: task.description,
        owner: task.assignee,
        status: "open",
        confidence: task.confidence,
      });
    }
  }

  return {
    projectId: project.id,
    connectionId: connection.id,
    messageIds,
    extractionResult,
  };
}

/**
 * Validates extracted tasks against expected patterns
 */
export function validateExtractedTasks(
  extractionResult: TaskExtractionTestResult,
  expectedPatterns: {
    taskCategories?: Record<string, RegExp>;
    minTasks?: number;
    maxTasks?: number;
    minConfidence?: number;
    expectedPeople?: string[];
  }
): TaskValidationResult {
  const issues: string[] = [];
  const categoryMatches: Record<string, number> = {};
  const peopleWithTasksSet = new Set<string>();

  // Check task count
  const taskCount = extractionResult.extractedTasks.length;
  if (expectedPatterns.minTasks && taskCount < expectedPatterns.minTasks) {
    issues.push(
      `Expected at least ${expectedPatterns.minTasks} tasks, got ${taskCount}`
    );
  }
  if (expectedPatterns.maxTasks && taskCount > expectedPatterns.maxTasks) {
    issues.push(
      `Expected at most ${expectedPatterns.maxTasks} tasks, got ${taskCount}`
    );
  }

  // Check confidence
  if (expectedPatterns.minConfidence) {
    const lowConfidenceTasks = extractionResult.extractedTasks.filter(
      (t) => t.confidence < expectedPatterns.minConfidence!
    );
    if (lowConfidenceTasks.length > 0) {
      issues.push(
        `${lowConfidenceTasks.length} tasks below confidence threshold ${expectedPatterns.minConfidence}`
      );
    }
  }

  // Check task categories
  if (expectedPatterns.taskCategories) {
    for (const [category, pattern] of Object.entries(
      expectedPatterns.taskCategories
    )) {
      const matchingTasks = extractionResult.extractedTasks.filter((t) =>
        pattern.test(t.description)
      );
      categoryMatches[category] = matchingTasks.length;
    }
  }

  // Collect people with tasks
  for (const task of extractionResult.extractedTasks) {
    if (task.assignee) {
      peopleWithTasksSet.add(task.assignee);
    }
  }

  const peopleWithTasks = Array.from(peopleWithTasksSet);

  // Check expected people
  if (expectedPatterns.expectedPeople) {
    const missingPeople = expectedPatterns.expectedPeople.filter(
      (p) => !peopleWithTasks.some((taskPerson) => taskPerson.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(taskPerson.toLowerCase()))
    );
    if (missingPeople.length > 0) {
      issues.push(`Missing tasks for people: ${missingPeople.join(", ")}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    categoryMatches,
    peopleWithTasks,
  };
}

/**
 * Cleans up test data created by seedAndExtractTasks
 */
export async function cleanupTaskExtractionTest(
  projectId: number,
  connectionId: number,
  messageIds: number[]
): Promise<void> {
  // Delete tasks
  await db.delete(tasks).where(eq(tasks.projectId, projectId));

  // Delete messages
  if (messageIds.length > 0) {
    await db.delete(messages).where(inArray(messages.id, messageIds));
  }

  // Delete connection
  await db.delete(connections).where(eq(connections.id, connectionId));

  // Delete project
  await db.delete(projects).where(eq(projects.id, projectId));
}

/**
 * Analyzes task extraction quality and prints detailed report
 */
export function analyzeExtractionQuality(
  scenarioName: string,
  result: TaskExtractionTestResult,
  validation?: TaskValidationResult
): void {
  console.log(`\n[Task Extraction Analysis: ${scenarioName}]`);
  console.log("=" .repeat(60));

  console.log(`\n📊 Overall Stats:`);
  console.log(`  Success: ${result.success}`);
  console.log(`  Total Tasks: ${result.extractedTasks.length}`);
  console.log(`  Processing Time: ${result.processingTimeMs}ms`);

  console.log(`\n📈 Confidence Distribution:`);
  console.log(`  High (>=0.8): ${result.confidenceStats.high}`);
  console.log(`  Medium (0.6-0.8): ${result.confidenceStats.medium}`);
  console.log(`  Low (<0.6): ${result.confidenceStats.low}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  if (validation) {
    console.log(`\n✅ Validation Results:`);
    console.log(`  Valid: ${validation.valid}`);

    if (validation.issues.length > 0) {
      console.log(`  Issues:`);
      for (const issue of validation.issues) {
        console.log(`    - ${issue}`);
      }
    }

    if (Object.keys(validation.categoryMatches).length > 0) {
      console.log(`\n📂 Category Matches:`);
      for (const [category, count] of Object.entries(
        validation.categoryMatches
      )) {
        console.log(`  ${category}: ${count} tasks`);
      }
    }

    console.log(`\n👥 People with Tasks: ${validation.peopleWithTasks.join(", ")}`);
  }

  // Show sample tasks
  const highConfidenceTasks = result.extractedTasks
    .filter((t) => t.confidence >= 0.8)
    .slice(0, 5);

  if (highConfidenceTasks.length > 0) {
    console.log(`\n🌟 Sample High-Confidence Tasks:`);
    for (const task of highConfidenceTasks) {
      console.log(`  • ${task.description.slice(0, 60)}...`);
      console.log(`    Assignee: ${task.assignee || "None"} | Confidence: ${task.confidence.toFixed(2)}`);
    }
  }

  console.log("=" .repeat(60));
}

/**
 * Gets detailed task breakdown by person
 */
export function getTasksByPerson(
  extractionResult: TaskExtractionTestResult
): Record<string, Array<{ description: string; confidence: number; deadline: string | null }>> {
  const byPerson: Record<string, Array<{ description: string; confidence: number; deadline: string | null }>> = {};

  for (const task of extractionResult.extractedTasks) {
    const person = task.assignee || "Unassigned";
    if (!byPerson[person]) {
      byPerson[person] = [];
    }
    byPerson[person].push({
      description: task.description,
      confidence: task.confidence,
      deadline: task.deadline,
    });
  }

  return byPerson;
}

/**
 * Gets task breakdown by category
 */
export function getTasksByCategory(
  extractionResult: TaskExtractionTestResult,
  categories: Record<string, RegExp>
): Record<string, string[]> {
  const byCategory: Record<string, string[]> = {};

  for (const [categoryName, pattern] of Object.entries(categories)) {
    byCategory[categoryName] = [];
    for (const task of extractionResult.extractedTasks) {
      if (pattern.test(task.description)) {
        byCategory[categoryName].push(task.description);
      }
    }
  }

  return byCategory;
}
