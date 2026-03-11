import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { tasks } from "../db/schema";
import { generateSimilarityHash } from "./task-similarity";

export type MergeStrategy = "keep_primary" | "combine_descriptions" | "smart_merge";

export interface MergeOptions {
  mergeStrategy?: MergeStrategy;
  reason?: string;
}

export interface MergeResult {
  primaryTaskId: number;
  mergedTaskIds: number[];
  strategy: MergeStrategy;
  changes: {
    descriptionChanged: boolean;
    deadlineChanged: boolean;
    ownerChanged: boolean;
  };
}

// Merge task data berdasarkan strategy
function mergeTaskData(
  primaryTask: typeof tasks.$inferSelect,
  duplicateTasks: (typeof tasks.$inferSelect)[],
  strategy: MergeStrategy
): {
  description: string;
  deadline: Date | null;
  owner: string | null;
} {
  switch (strategy) {
    case "keep_primary":
      return {
        description: primaryTask.description,
        deadline: primaryTask.deadline,
        owner: primaryTask.owner,
      };

    case "combine_descriptions": {
      // Combine all unique descriptions
      const allDescriptions = [
        primaryTask.description,
        ...duplicateTasks.map((t) => t.description),
      ];
      const uniqueDescriptions = [...new Set(allDescriptions)];
      const combinedDescription = uniqueDescriptions.join(" / ");

      // Use earliest deadline
      const allDeadlines = [
        primaryTask.deadline,
        ...duplicateTasks.map((t) => t.deadline).filter(Boolean),
      ].filter(Boolean) as Date[];

      const earliestDeadline =
        allDeadlines.length > 0
          ? allDeadlines.sort((a, b) => a.getTime() - b.getTime())[0]
          : primaryTask.deadline;

      // Use first available owner
      const owner =
        primaryTask.owner ||
        duplicateTasks.find((t) => t.owner)?.owner ||
        null;

      return {
        description: combinedDescription,
        deadline: earliestDeadline,
        owner,
      };
    }

    case "smart_merge": {
      // Smart merge: ambil description terpanjang (paling detailed)
      const allDescriptions = [
        primaryTask.description,
        ...duplicateTasks.map((t) => t.description),
      ];
      const longestDescription = allDescriptions.reduce((longest, current) =>
        current.length > longest.length ? current : longest
      );

      // Use earliest deadline (most urgent)
      const allDeadlines = [
        primaryTask.deadline,
        ...duplicateTasks.map((t) => t.deadline).filter(Boolean),
      ].filter(Boolean) as Date[];

      const earliestDeadline =
        allDeadlines.length > 0
          ? allDeadlines.sort((a, b) => a.getTime() - b.getTime())[0]
          : primaryTask.deadline;

      // Use most specific owner (prefer non-null)
      const owner =
        primaryTask.owner ||
        duplicateTasks.find((t) => t.owner)?.owner ||
        null;

      return {
        description: longestDescription,
        deadline: earliestDeadline,
        owner,
      };
    }

    default:
      return {
        description: primaryTask.description,
        deadline: primaryTask.deadline,
        owner: primaryTask.owner,
      };
  }
}

// Main merge function
export async function mergeTasks(
  primaryTaskId: number,
  duplicateTaskIds: number[],
  options: MergeOptions = {}
): Promise<MergeResult> {
  const { mergeStrategy = "smart_merge", reason } = options;

  // Fetch primary task
  const primaryTask = await db.query.tasks.findFirst({
    where: eq(tasks.id, primaryTaskId),
  });

  if (!primaryTask) {
    throw new Error(`Primary task not found: ${primaryTaskId}`);
  }

  // Validate that we're not trying to merge the same task
  const uniqueIdsToMerge = duplicateTaskIds.filter((id) => id !== primaryTaskId);

  if (uniqueIdsToMerge.length === 0) {
    throw new Error("No valid tasks to merge (cannot merge task with itself)");
  }

  // Fetch duplicate tasks
  const duplicateTasks = await db.query.tasks.findMany({
    where: inArray(tasks.id, uniqueIdsToMerge),
  });

  if (duplicateTasks.length === 0) {
    throw new Error(`No tasks found to merge with IDs: ${uniqueIdsToMerge.join(", ")}`);
  }

  // Check all tasks are in the same project
  const differentProjectTasks = duplicateTasks.filter(
    (t) => t.projectId !== primaryTask.projectId
  );

  if (differentProjectTasks.length > 0) {
    throw new Error(
      `Cannot merge tasks from different projects. ` +
        `Primary: ${primaryTask.projectId}, ` +
        `Different: ${differentProjectTasks.map((t) => `${t.id} (project ${t.projectId})`).join(", ")}`
    );
  }

  // Merge data
  const mergedData = mergeTaskData(primaryTask, duplicateTasks, mergeStrategy);

  // Track changes
  const changes = {
    descriptionChanged: mergedData.description !== primaryTask.description,
    deadlineChanged:
      mergedData.deadline?.getTime() !== primaryTask.deadline?.getTime(),
    ownerChanged: mergedData.owner !== primaryTask.owner,
  };

  // Collect all merged task IDs (including previously merged ones)
  const previousMergedIds = (primaryTask.mergedTaskIds || []) as number[];
  const allMergedIds = [...previousMergedIds, ...uniqueIdsToMerge];

  // Update primary task
  await db
    .update(tasks)
    .set({
      description: mergedData.description,
      deadline: mergedData.deadline,
      owner: mergedData.owner,
      mergedTaskIds: allMergedIds,
      similarityHash: generateSimilarityHash(mergedData.description),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, primaryTaskId));

  // Mark duplicates as merged
  for (const dupId of uniqueIdsToMerge) {
    await db
      .update(tasks)
      .set({
        status: "merged",
        parentTaskId: primaryTaskId,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, dupId));
  }

  console.log(
    `[TaskMerger] Merged ${uniqueIdsToMerge.length} tasks into ${primaryTaskId} ` +
      `using strategy: ${mergeStrategy}` +
      (reason ? ` (reason: ${reason})` : "")
  );

  return {
    primaryTaskId,
    mergedTaskIds: uniqueIdsToMerge,
    strategy: mergeStrategy,
    changes,
  };
}

// Unmerge tasks (restore merged tasks to active status)
export async function unmergeTasks(
  primaryTaskId: number,
  taskIdsToRestore?: number[]
): Promise<number[]> {
  const primaryTask = await db.query.tasks.findFirst({
    where: eq(tasks.id, primaryTaskId),
  });

  if (!primaryTask) {
    throw new Error(`Primary task not found: ${primaryTaskId}`);
  }

  const mergedIds = (primaryTask.mergedTaskIds || []) as number[];

  if (mergedIds.length === 0) {
    throw new Error(`Task ${primaryTaskId} has no merged tasks`);
  }

  // Determine which tasks to restore
  const idsToRestore = taskIdsToRestore || mergedIds;

  // Validate all IDs are in the merged list
  const invalidIds = idsToRestore.filter((id) => !mergedIds.includes(id));
  if (invalidIds.length > 0) {
    throw new Error(
      `Cannot restore tasks that were not merged: ${invalidIds.join(", ")}`
    );
  }

  // Restore tasks
  for (const taskId of idsToRestore) {
    await db
      .update(tasks)
      .set({
        status: "open",
        parentTaskId: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));
  }

  // Update primary task's merged list
  const remainingMergedIds = mergedIds.filter((id) => !idsToRestore.includes(id));
  await db
    .update(tasks)
    .set({
      mergedTaskIds: remainingMergedIds,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, primaryTaskId));

  console.log(
    `[TaskMerger] Restored ${idsToRestore.length} tasks from merge with ${primaryTaskId}`
  );

  return idsToRestore;
}

// Get merge history untuk sebuah task
export async function getMergeHistory(
  taskId: number
): Promise<{
  primaryTask: typeof tasks.$inferSelect | null;
  mergedTasks: (typeof tasks.$inferSelect)[];
  isMerged: boolean;
  parentTask: typeof tasks.$inferSelect | null;
}> {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) {
    return {
      primaryTask: null,
      mergedTasks: [],
      isMerged: false,
      parentTask: null,
    };
  }

  // Check if this task is merged into another
  if (task.status === "merged" && task.parentTaskId) {
    const parentTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, task.parentTaskId),
    });

    return {
      primaryTask: null,
      mergedTasks: [],
      isMerged: true,
      parentTask: parentTask ?? null,
    };
  }

  // This is a primary task, get its merged children
  const mergedIds = (task.mergedTaskIds || []) as number[];

  if (mergedIds.length === 0) {
    return {
      primaryTask: task,
      mergedTasks: [],
      isMerged: false,
      parentTask: null,
    };
  }

  const mergedTasks = await db.query.tasks.findMany({
    where: inArray(tasks.id, mergedIds),
  });

  return {
    primaryTask: task,
    mergedTasks,
    isMerged: false,
    parentTask: null,
  };
}

// Find potential merge candidates (tasks yang similar tapi belum di-merge)
export async function findMergeCandidates(
  projectId: number,
  threshold: number = 0.75
): Promise<
  Array<{
    task: typeof tasks.$inferSelect;
    candidates: Array<{
      task: typeof tasks.$inferSelect;
      similarityScore: number;
    }>;
  }>
> {
  const allTasks = await db.query.tasks.findMany({
    where: eq(tasks.projectId, projectId),
  });

  const openTasks = allTasks.filter(
    (t) => t.status === "open" && !t.parentTaskId
  );

  const candidates: Array<{
    task: typeof tasks.$inferSelect;
    candidates: Array<{
      task: typeof tasks.$inferSelect;
      similarityScore: number;
    }>;
  }> = [];

  // Compare each task dengan tasks lainnya
  for (let i = 0; i < openTasks.length; i++) {
    const task = openTasks[i];
    const taskCandidates: Array<{
      task: typeof tasks.$inferSelect;
      similarityScore: number;
    }> = [];

    for (let j = 0; j < openTasks.length; j++) {
      if (i === j) continue;

      const otherTask = openTasks[j];

      // Calculate similarity (simplified version)
      const norm1 = task.description.toLowerCase().trim();
      const norm2 = otherTask.description.toLowerCase().trim();

      let similarity = 0;

      if (norm1 === norm2) {
        similarity = 1.0;
      } else {
        // Simple keyword overlap
        const words1 = new Set(norm1.split(/\s+/));
        const words2 = new Set(norm2.split(/\s+/));
        const intersection = new Set([...words1].filter((x) => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        similarity = intersection.size / union.size;
      }

      if (similarity >= threshold) {
        taskCandidates.push({
          task: otherTask,
          similarityScore: similarity,
        });
      }
    }

    if (taskCandidates.length > 0) {
      // Sort by similarity
      taskCandidates.sort((a, b) => b.similarityScore - a.similarityScore);
      candidates.push({
        task,
        candidates: taskCandidates.slice(0, 3), // Top 3 candidates
      });
    }
  }

  return candidates;
}
