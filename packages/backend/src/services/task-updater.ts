import { eq } from "drizzle-orm";
import { db } from "../db";
import { tasks } from "../db/schema";
import { generateSimilarityHash } from "./task-similarity";

export interface TaskUpdateInput {
  deadline?: string | null;
  owner?: string | null;
  messageId?: number;
  confidence?: number;
}

export interface TaskEvolution {
  taskId: number;
  previousDescription: string | null;
  newDescription: string;
  previousDeadline: Date | null;
  newDeadline: Date | null;
  updatedFields: string[];
  updateCount: number;
  updatedAt: Date;
}

// Parse natural language deadline (duplicate dari task-extractor untuk menghindari circular dependency)
function parseNaturalLanguageDeadline(deadlineText: string | null): Date | null {
  if (!deadlineText) return null;

  const now = new Date();
  const text = deadlineText.toLowerCase().trim();

  // Handle Indonesian date format: "15 Maret" or "tanggal 15 Maret"
  const indoDatePattern =
    /(?:tanggal|tgl)?\s*(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i;
  const indoMatch = text.match(indoDatePattern);
  if (indoMatch) {
    const day = parseInt(indoMatch[1], 10);
    const monthNames = [
      "januari",
      "februari",
      "maret",
      "april",
      "mei",
      "juni",
      "juli",
      "agustus",
      "september",
      "oktober",
      "november",
      "desember",
    ];
    const month = monthNames.indexOf(indoMatch[2].toLowerCase());
    if (month !== -1) {
      const currentYear = now.getFullYear();
      const targetDate = new Date(currentYear, month, day, 17, 0, 0);
      if (targetDate.getFullYear() !== currentYear) {
        targetDate.setFullYear(currentYear);
      }
      if (targetDate < now) {
        targetDate.setFullYear(currentYear + 1);
      }
      return targetDate;
    }
  }

  // Handle English date format: "March 15"
  const engDatePattern =
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i;
  const engMatch = text.match(engDatePattern);
  if (engMatch) {
    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const month = monthNames.indexOf(engMatch[1].toLowerCase());
    const day = parseInt(engMatch[2], 10);
    if (month !== -1) {
      const currentYear = now.getFullYear();
      const targetDate = new Date(currentYear, month, day, 17, 0, 0);
      if (targetDate.getFullYear() !== currentYear) {
        targetDate.setFullYear(currentYear);
      }
      if (targetDate < now) {
        targetDate.setFullYear(currentYear + 1);
      }
      return targetDate;
    }
  }

  // Try direct date parsing
  const directDate = new Date(text);
  if (!Number.isNaN(directDate.getTime())) {
    const year = directDate.getFullYear();
    const currentYear = now.getFullYear();

    if (year >= currentYear - 1 && year <= currentYear + 2) {
      return directDate;
    }
    if (year < currentYear) {
      directDate.setFullYear(currentYear);
      if (directDate < now) {
        directDate.setFullYear(currentYear + 1);
      }
      return directDate;
    }
  }

  // Indonesian relative dates
  if (text.includes("besok") || text.includes("tomorrow")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    return tomorrow;
  }

  if (text.includes("lusa") || text.includes("day after tomorrow")) {
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(17, 0, 0, 0);
    return dayAfter;
  }

  // Pattern: "X hari lagi" or "in X days"
  const daysMatch = text.match(/(\d+)\s*(?:hari|days?)/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);
    futureDate.setHours(17, 0, 0, 0);
    return futureDate;
  }

  // Day of week patterns
  const daysOfWeek = [
    "minggu",
    "senin",
    "selasa",
    "rabu",
    "kamis",
    "jumat",
    "sabtu",
  ];
  const englishDays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  for (let i = 0; i < 7; i++) {
    if (text.includes(daysOfWeek[i]) || text.includes(englishDays[i])) {
      const targetDay = i;
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;

      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysUntil);
      targetDate.setHours(17, 0, 0, 0);
      return targetDate;
    }
  }

  // "minggu depan" / "next week"
  if (text.includes("minggu depan") || text.includes("next week")) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(17, 0, 0, 0);
    return nextWeek;
  }

  // "bulan depan" / "next month"
  if (text.includes("bulan depan") || text.includes("next month")) {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setHours(17, 0, 0, 0);
    return nextMonth;
  }

  // Pattern: "tanggal X" or "tgl X"
  const dateMatch = text.match(/(?:tanggal|tgl)\s*(\d{1,2})/i);
  if (dateMatch) {
    const dayOfMonth = parseInt(dateMatch[1], 10);
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      dayOfMonth,
      17,
      0,
      0
    );
    if (targetDate < now) {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }
    return targetDate;
  }

  // Pattern: specific date like "15 Maret" or "March 15"
  const monthNames = [
    "januari",
    "februari",
    "maret",
    "april",
    "mei",
    "juni",
    "juli",
    "agustus",
    "september",
    "oktober",
    "november",
    "desember",
  ];
  const engMonths = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  for (let i = 0; i < 12; i++) {
    if (text.includes(monthNames[i]) || text.includes(engMonths[i])) {
      const dayMatch = text.match(/(\d{1,2})/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1], 10);
        const targetDate = new Date(now.getFullYear(), i, day, 17, 0, 0);
        if (targetDate < now) {
          targetDate.setFullYear(targetDate.getFullYear() + 1);
        }
        return targetDate;
      }
    }
  }

  // Time patterns
  if (text.includes("jam") || text.includes(":")) {
    const timeMatch =
      text.match(/jam\s*(\d{1,2})(?::(\d{2}))?\s*(?:sore|pm)?/i) ||
      text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;

      if ((text.includes("sore") || text.includes("pm")) && hours < 12) {
        hours += 12;
      }

      const targetDate = new Date(now);
      targetDate.setHours(hours, minutes, 0, 0);

      if (targetDate < now) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      return targetDate;
    }
  }

  return null;
}

// Check if new deadline is more specific/better than existing
function isMoreSpecificDeadline(
  newDeadline: Date | null,
  existingDeadline: Date | null
): boolean {
  if (!newDeadline) return false;
  if (!existingDeadline) return true;

  // If existing deadline is in the past, new deadline is better
  const now = new Date();
  if (existingDeadline < now) return true;

  // If new deadline is more specific (has time component that's not default 17:00)
  const isNewSpecific =
    newDeadline.getHours() !== 17 || newDeadline.getMinutes() !== 0;
  const isExistingSpecific =
    existingDeadline.getHours() !== 17 ||
    existingDeadline.getMinutes() !== 0;

  if (isNewSpecific && !isExistingSpecific) return true;

  // If new deadline is earlier than existing (more urgent)
  if (newDeadline < existingDeadline) return true;

  return false;
}

// Main function to update existing task with new information
export async function updateExistingTask(
  taskId: number,
  update: TaskUpdateInput,
  newDescription?: string
): Promise<TaskEvolution | null> {
  const existingTask = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!existingTask) {
    console.warn(`[TaskUpdater] Task not found: ${taskId}`);
    return null;
  }

  const updates: Partial<typeof tasks.$inferInsert> = {
    updatedAt: new Date(),
    updateCount: (existingTask.updateCount || 0) + 1,
  };

  const updatedFields: string[] = [];
  let newDeadline: Date | null = null;

  // Track evolution jika description berubah
  if (newDescription && newDescription !== existingTask.description) {
    updates.previousDescription = existingTask.description;
    updates.description = newDescription;
    updates.similarityHash = generateSimilarityHash(newDescription);
    updatedFields.push("description");
  }

  // Update deadline hanya jika ada dan lebih spesifik
  if (update.deadline) {
    newDeadline = parseNaturalLanguageDeadline(update.deadline);
    if (isMoreSpecificDeadline(newDeadline, existingTask.deadline)) {
      updates.previousDeadline = existingTask.deadline;
      updates.deadline = newDeadline;
      updatedFields.push("deadline");
    }
  }

  // Update owner jika sebelumnya null atau berbeda
  if (update.owner && update.owner !== existingTask.owner) {
    updates.owner = update.owner;
    updatedFields.push("owner");
  }

  // Update messageId to track the latest message referencing this task
  if (update.messageId && update.messageId !== existingTask.messageId) {
    updates.messageId = update.messageId;
    updatedFields.push("messageId");
  }

  // Update confidence jika lebih tinggi
  if (
    update.confidence !== undefined &&
    update.confidence > existingTask.confidence
  ) {
    updates.confidence = update.confidence;
    updatedFields.push("confidence");
  }

  // Only update if there are changes
  if (updatedFields.length === 0) {
    console.log(`[TaskUpdater] No changes needed for task ${taskId}`);
    return null;
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, taskId));

  const evolution: TaskEvolution = {
    taskId,
    previousDescription:
      updatedFields.includes("description") && newDescription
        ? existingTask.description
        : null,
    newDescription: newDescription || existingTask.description,
    previousDeadline:
      updatedFields.includes("deadline") && newDeadline
        ? existingTask.deadline
        : null,
    newDeadline: newDeadline || existingTask.deadline,
    updatedFields,
    updateCount: updates.updateCount as number,
    updatedAt: updates.updatedAt as Date,
  };

  console.log(
    `[TaskUpdater] Updated task ${taskId}: ${updatedFields.join(", ")} (update #${evolution.updateCount})`
  );

  return evolution;
}

// Get task evolution history (mengembalikan task dengan previous values)
export async function getTaskHistory(
  taskId: number
): Promise<TaskEvolution | null> {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) return null;

  // If task has never been updated
  if (!task.updateCount || task.updateCount === 0) {
    return {
      taskId,
      previousDescription: null,
      newDescription: task.description,
      previousDeadline: null,
      newDeadline: task.deadline,
      updatedFields: [],
      updateCount: 0,
      updatedAt: task.updatedAt,
    };
  }

  return {
    taskId,
    previousDescription: task.previousDescription || null,
    newDescription: task.description,
    previousDeadline: task.previousDeadline || null,
    newDeadline: task.deadline,
    updatedFields: [
      ...(task.previousDescription ? ["description"] : []),
      ...(task.previousDeadline ? ["deadline"] : []),
    ],
    updateCount: task.updateCount,
    updatedAt: task.updatedAt,
  };
}

// Batch update multiple tasks (untuk manual merge atau bulk operations)
export async function batchUpdateTasks(
  updates: Array<{ taskId: number; update: TaskUpdateInput; newDescription?: string }>
): Promise<TaskEvolution[]> {
  const results: TaskEvolution[] = [];

  for (const { taskId, update, newDescription } of updates) {
    const result = await updateExistingTask(taskId, update, newDescription);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
