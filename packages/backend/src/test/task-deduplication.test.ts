import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { tasks, messages, projects, connections } from "../db/schema";
import {
  findSimilarTask,
  findSimilarTasks,
  shouldAutoUpdate,
  shouldSuggestMerge,
} from "../services/task-similarity";
import { updateExistingTask, getTaskHistory } from "../services/task-updater";
import { mergeTasks, getMergeHistory } from "../services/task-merger";
import { setupTestScenario, cleanupTestScenario } from "./utils/seed-messages";
import { taskUpdateScenario } from "./fixtures/scenarios/task-update";

describe("Task Deduplication Integration", () => {
  let testContext: Awaited<ReturnType<typeof setupTestScenario>>;

  describe("Similarity Detection", () => {
    it("should find exact match task", async () => {
      // Create a task
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      const [task] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Implement user login authentication",
          status: "open",
          confidence: 0.9,
        })
        .returning();

      // Search for exact match
      const result = await findSimilarTask(project.id, task.description, {
        threshold: 0.8,
      });

      expect(result.existingTask).not.toBeNull();
      expect(result.existingTask!.id).toBe(task.id);
      expect(result.matchType).toBe("exact");
      expect(result.similarityScore).toBe(1.0);

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    it("should find similar task with high similarity", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      const [task] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Setup payment gateway integration",
          status: "open",
          confidence: 0.9,
        })
        .returning();

      // Search for semantically similar task
      const result = await findSimilarTask(
        project.id,
        "Integrate payment gateway into system",
        { threshold: 0.6 }
      );

      expect(result.existingTask).not.toBeNull();
      expect(result.existingTask!.id).toBe(task.id);
      expect(result.similarityScore).toBeGreaterThan(0.6);

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    it("should not find match for unrelated task", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      await db.insert(tasks).values({
        projectId: project.id,
        description: "Fix database connection bug",
        status: "open",
        confidence: 0.9,
      });

      // Search for completely different task
      const result = await findSimilarTask(
        project.id,
        "Design new homepage layout",
        { threshold: 0.8 }
      );

      expect(result.existingTask).toBeNull();
      expect(result.matchType).toBe("none");

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    it("should return multiple similar tasks", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      await db.insert(tasks).values([
        {
          projectId: project.id,
          description: "Implement user login",
          status: "open",
          confidence: 0.9,
        },
        {
          projectId: project.id,
          description: "Create login page",
          status: "open",
          confidence: 0.85,
        },
        {
          projectId: project.id,
          description: "Fix database bug",
          status: "open",
          confidence: 0.9,
        },
      ]);

      const results = await findSimilarTasks(
        project.id,
        "Build user authentication",
        { threshold: 0.5, maxResults: 5 }
      );

      expect(results.length).toBeGreaterThan(0);
      // Should find at least 2 login-related tasks
      expect(results.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });
  });

  describe("Task Update Flow", () => {
    it("should update task deadline", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      const [task] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Setup payment gateway",
          status: "open",
          confidence: 0.9,
        })
        .returning();

      // Update with deadline
      const evolution = await updateExistingTask(task.id, {
        deadline: "besok jam 5 sore",
        owner: null,
      });

      expect(evolution).not.toBeNull();
      expect(evolution!.updatedFields).toContain("deadline");

      // Verify update
      const updatedTask = await db.query.tasks.findFirst({
        where: eq(tasks.id, task.id),
      });

      expect(updatedTask!.deadline).not.toBeNull();
      expect(updatedTask!.updateCount).toBe(1);

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    it("should update task owner", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      const [task] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Setup payment gateway",
          status: "open",
          confidence: 0.9,
          owner: null,
        })
        .returning();

      // Update with owner
      const evolution = await updateExistingTask(task.id, {
        deadline: null,
        owner: "John Doe",
      });

      expect(evolution).not.toBeNull();
      expect(evolution!.updatedFields).toContain("owner");

      // Verify update
      const updatedTask = await db.query.tasks.findFirst({
        where: eq(tasks.id, task.id),
      });

      expect(updatedTask!.owner).toBe("John Doe");

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    it("should track task evolution", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      const [task] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Setup payment gateway",
          status: "open",
          confidence: 0.9,
        })
        .returning();

      // Update description
      await updateExistingTask(
        task.id,
        { deadline: null, owner: null },
        "Setup payment gateway with Stripe integration"
      );

      // Get history
      const history = await getTaskHistory(task.id);

      expect(history).not.toBeNull();
      expect(history!.updateCount).toBe(1);
      expect(history!.previousDescription).toBe("Setup payment gateway");
      expect(history!.newDescription).toBe(
        "Setup payment gateway with Stripe integration"
      );

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    it("should not update if no changes", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      const [task] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Setup payment gateway",
          status: "open",
          confidence: 0.9,
        })
        .returning();

      // Try to update with same values
      const evolution = await updateExistingTask(
        task.id,
        { deadline: null, owner: null },
        "Setup payment gateway"
      );

      expect(evolution).toBeNull(); // No changes made

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });
  });

  describe("Task Merge Flow", () => {
    it("should merge tasks successfully", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      const [primaryTask] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Implement user login with email and password",
          status: "open",
          confidence: 0.9,
        })
        .returning();

      const [duplicateTask] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Setup user authentication",
          status: "open",
          confidence: 0.85,
          deadline: new Date(Date.now() + 86400000), // Tomorrow
        })
        .returning();

      // Merge tasks
      const result = await mergeTasks(primaryTask.id, [duplicateTask.id], {
        mergeStrategy: "smart_merge",
      });

      expect(result.primaryTaskId).toBe(primaryTask.id);
      expect(result.mergedTaskIds).toContain(duplicateTask.id);

      // Verify primary task updated
      const updatedPrimary = await db.query.tasks.findFirst({
        where: eq(tasks.id, primaryTask.id),
      });
      expect(updatedPrimary!.mergedTaskIds).toContain(duplicateTask.id);

      // Verify duplicate task merged
      const updatedDuplicate = await db.query.tasks.findFirst({
        where: eq(tasks.id, duplicateTask.id),
      });
      expect(updatedDuplicate!.status).toBe("merged");
      expect(updatedDuplicate!.parentTaskId).toBe(primaryTask.id);

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    it("should get merge history", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      const [primaryTask] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Implement user login",
          status: "open",
          confidence: 0.9,
        })
        .returning();

      const [mergedTask] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Setup authentication",
          status: "open",
          confidence: 0.85,
        })
        .returning();

      // Merge
      await mergeTasks(primaryTask.id, [mergedTask.id]);

      // Get merge history
      const history = await getMergeHistory(primaryTask.id);

      expect(history.isMerged).toBe(false);
      expect(history.primaryTask).not.toBeNull();
      expect(history.mergedTasks.length).toBe(1);
      expect(history.mergedTasks[0].id).toBe(mergedTask.id);

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    it("should detect merged task", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Test Project",
          healthScore: 100,
        })
        .returning();

      const [primaryTask] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Implement user login",
          status: "open",
          confidence: 0.9,
        })
        .returning();

      const [mergedTask] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          description: "Setup authentication",
          status: "open",
          confidence: 0.85,
        })
        .returning();

      // Merge
      await mergeTasks(primaryTask.id, [mergedTask.id]);

      // Check merged task history
      const history = await getMergeHistory(mergedTask.id);

      expect(history.isMerged).toBe(true);
      expect(history.parentTask).not.toBeNull();
      expect(history.parentTask!.id).toBe(primaryTask.id);

      // Cleanup
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    });
  });

  describe("Decision Logic", () => {
    it("shouldAutoUpdate returns true for exact/high match", () => {
      expect(
        shouldAutoUpdate({
          existingTask: null as any,
          similarityScore: 0.95,
          matchType: "exact",
        })
      ).toBe(true);

      expect(
        shouldAutoUpdate({
          existingTask: null as any,
          similarityScore: 0.85,
          matchType: "high",
        })
      ).toBe(true);
    });

    it("shouldAutoUpdate returns false for medium/no match", () => {
      expect(
        shouldAutoUpdate({
          existingTask: null as any,
          similarityScore: 0.7,
          matchType: "medium",
        })
      ).toBe(false);

      expect(
        shouldAutoUpdate({
          existingTask: null as any,
          similarityScore: 0.4,
          matchType: "none",
        })
      ).toBe(false);
    });

    it("shouldSuggestMerge returns true for medium match", () => {
      expect(
        shouldSuggestMerge({
          existingTask: null as any,
          similarityScore: 0.7,
          matchType: "medium",
        })
      ).toBe(true);
    });

    it("shouldSuggestMerge returns false for exact/high/no match", () => {
      expect(
        shouldSuggestMerge({
          existingTask: null as any,
          similarityScore: 0.95,
          matchType: "exact",
        })
      ).toBe(false);

      expect(
        shouldSuggestMerge({
          existingTask: null as any,
          similarityScore: 0.85,
          matchType: "high",
        })
      ).toBe(false);

      expect(
        shouldSuggestMerge({
          existingTask: null as any,
          similarityScore: 0.4,
          matchType: "none",
        })
      ).toBe(false);
    });
  });
});
