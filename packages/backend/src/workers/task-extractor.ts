import { inArray, eq, and } from "drizzle-orm";
import { zodResponseFormat } from "openai/helpers/zod";
import { db } from "../db";
import { messages, tasks, projects } from "../db/schema";
import {
  taskExtractionSystemPrompt,
  DeadlineExtractionSchema,
  buildTaskExtractionPrompt,
  CONFIDENCE_THRESHOLD,
  deadlineParsingGuidelines,
} from "../prompts/task-extraction";
import { getQueue } from "../queue";
import { JobTypes, type ProcessBatchJob, type DetectRisksJob } from "../queue/jobs";
import { llmChatCompletionsCreate, DEFAULT_MODEL } from "../services/llm";

/**
 * Extract deadline from message text based on task description
 * Uses pattern matching to find deadline mentions
 */
function extractDeadlineFromText(messageText: string, taskDescription: string): Date | null {
  const text = messageText.toLowerCase();

  // Common deadline patterns in Indonesian and English
  const deadlinePatterns = [
    // Pattern: deadline besok jam X
    { regex: /deadline\s+besok(?:\s+jam\s+(\d+)(?::(\d+))?)?(?:\s+sore)?/i, type: "tomorrow" },
    // Pattern: besok jam X sore
    { regex: /besok(?:\s+jam\s+(\d+)(?::(\d+))?)?(?:\s+sore|malam|pagi)?/i, type: "tomorrow" },
    // Pattern: before Friday, by Friday
    { regex: /(?:before|by)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|senin|selasa|rabu|kamis|jumat|sabtu|minggu)/i, type: "dayofweek" },
    // Pattern: 15 Maret, March 15
    { regex: /(?:tanggal|tgl)?\s*(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|january|february|march|april|may|june|july|august|september|october|november|december)/i, type: "specificdate" },
    // Pattern: minggu depan, next week
    { regex: /(?:minggu|pekan)\s+depan|next\s+week/i, type: "nextweek" },
    // Pattern: X hari lagi
    { regex: /(\d+)\s+(?:hari|days?)\s+(?:lagi|sebelum|before|from\s+now)/i, type: "dayslater" },
    // Pattern: lusa
    { regex: /\blusa\b|day\s+after\s+tomorrow/i, type: "dayafter" },
    // Pattern: bulan depan
    { regex: /bulan\s+depan|next\s+month/i, type: "nextmonth" },
  ];

  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const now = new Date();

      switch (pattern.type) {
        case "tomorrow": {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          let hours = 17; // default 5 PM
          if (match[1]) {
            hours = parseInt(match[1], 10);
            if (text.includes("sore") && hours < 12) hours += 12;
          }
          tomorrow.setHours(hours, match[2] ? parseInt(match[2], 10) : 0, 0, 0);
          return tomorrow;
        }
        case "dayofweek": {
          const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
          const indoDays = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
          const targetDayName = match[1].toLowerCase();
          let targetDay = dayNames.indexOf(targetDayName);
          if (targetDay === -1) targetDay = indoDays.indexOf(targetDayName);

          if (targetDay !== -1) {
            const currentDay = now.getDay();
            let daysUntil = targetDay - currentDay;
            if (daysUntil <= 0) daysUntil += 7;

            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + daysUntil);
            targetDate.setHours(17, 0, 0, 0);
            return targetDate;
          }
          break;
        }
        case "specificdate": {
          const day = parseInt(match[1], 10);
          const monthNames = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
          const engMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
          let month = monthNames.indexOf(match[2].toLowerCase());
          if (month === -1) month = engMonths.indexOf(match[2].toLowerCase());

          if (month !== -1) {
            // Use current year, and if date already passed, use next year
            const currentYear = new Date().getFullYear();
            const targetDate = new Date(currentYear, month, day, 17, 0, 0);
            // Double-check the year is correct (not 2001 or other invalid year)
            if (targetDate.getFullYear() !== currentYear) {
              targetDate.setFullYear(currentYear);
            }
            if (targetDate < now) {
              targetDate.setFullYear(currentYear + 1);
            }
            return targetDate;
          }
          break;
        }
        case "nextweek": {
          const nextWeek = new Date(now);
          nextWeek.setDate(nextWeek.getDate() + 7);
          nextWeek.setHours(17, 0, 0, 0);
          return nextWeek;
        }
        case "dayafter": {
          const dayAfter = new Date(now);
          dayAfter.setDate(dayAfter.getDate() + 2);
          dayAfter.setHours(17, 0, 0, 0);
          return dayAfter;
        }
        case "dayslater": {
          const days = parseInt(match[1], 10);
          const futureDate = new Date(now);
          futureDate.setDate(futureDate.getDate() + days);
          futureDate.setHours(17, 0, 0, 0);
          return futureDate;
        }
        case "nextmonth": {
          const nextMonth = new Date(now);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          nextMonth.setHours(17, 0, 0, 0);
          return nextMonth;
        }
      }
    }
  }

  return null;
}

/**
 * Parse natural language deadline into Date object
 * Handles Indonesian and English relative dates
 */
function parseNaturalLanguageDeadline(deadlineText: string | null): Date | null {
  if (!deadlineText) return null;

  const now = new Date();
  const text = deadlineText.toLowerCase().trim();

  // Handle Indonesian date format: "15 Maret" or "tanggal 15 Maret"
  const indoDatePattern = /(?:tanggal|tgl)?\s*(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i;
  const indoMatch = text.match(indoDatePattern);
  if (indoMatch) {
    const day = parseInt(indoMatch[1], 10);
    const monthNames = ["januari", "februari", "maret", "april", "mei", "juni",
                        "juli", "agustus", "september", "oktober", "november", "desember"];
    const month = monthNames.indexOf(indoMatch[2].toLowerCase());
    if (month !== -1) {
      const currentYear = now.getFullYear();
      const targetDate = new Date(currentYear, month, day, 17, 0, 0);
      // Ensure year is correct
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
  const engDatePattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i;
  const engMatch = text.match(engDatePattern);
  if (engMatch) {
    const monthNames = ["january", "february", "march", "april", "may", "june",
                        "july", "august", "september", "october", "november", "december"];
    const month = monthNames.indexOf(engMatch[1].toLowerCase());
    const day = parseInt(engMatch[2], 10);
    if (month !== -1) {
      const currentYear = now.getFullYear();
      const targetDate = new Date(currentYear, month, day, 17, 0, 0);
      // Ensure year is correct
      if (targetDate.getFullYear() !== currentYear) {
        targetDate.setFullYear(currentYear);
      }
      if (targetDate < now) {
        targetDate.setFullYear(currentYear + 1);
      }
      return targetDate;
    }
  }

  // Try direct date parsing first, but validate the year is reasonable
  const directDate = new Date(text);
  if (!Number.isNaN(directDate.getTime())) {
    const year = directDate.getFullYear();
    const currentYear = now.getFullYear();

    // Only accept if year is current year +/- 1 (not 2001, 1970, etc.)
    if (year >= currentYear - 1 && year <= currentYear + 2) {
      return directDate;
    }
    // If year is way off, try to fix it
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
    tomorrow.setHours(17, 0, 0, 0); // Default to 5 PM
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
  const daysOfWeek = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
  const englishDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  for (let i = 0; i < 7; i++) {
    if (text.includes(daysOfWeek[i]) || text.includes(englishDays[i])) {
      const targetDay = i;
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7; // Next week

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
    const targetDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 17, 0, 0);
    if (targetDate < now) {
      targetDate.setMonth(targetDate.getMonth() + 1); // Next month
    }
    return targetDate;
  }

  // Pattern: specific date like "15 Maret" or "March 15"
  const monthNames = ["januari", "februari", "maret", "april", "mei", "juni",
                      "juli", "agustus", "september", "oktober", "november", "desember"];
  const engMonths = ["january", "february", "march", "april", "may", "june",
                     "july", "august", "september", "october", "november", "december"];

  for (let i = 0; i < 12; i++) {
    if (text.includes(monthNames[i]) || text.includes(engMonths[i])) {
      const dayMatch = text.match(/(\d{1,2})/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1], 10);
        const targetDate = new Date(now.getFullYear(), i, day, 17, 0, 0);
        if (targetDate < now) {
          targetDate.setFullYear(targetDate.getFullYear() + 1); // Next year
        }
        return targetDate;
      }
    }
  }

  // Time patterns - add time to today/tomorrow
  if (text.includes("jam") || text.includes(":")) {
    const timeMatch = text.match(/jam\s*(\d{1,2})(?::(\d{2}))?\s*(?:sore|pm)?/i) ||
                       text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;

      // Adjust for PM/sore
      if ((text.includes("sore") || text.includes("pm")) && hours < 12) {
        hours += 12;
      }

      const targetDate = new Date(now);
      targetDate.setHours(hours, minutes, 0, 0);

      // If time already passed, assume tomorrow
      if (targetDate < now) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      return targetDate;
    }
  }

  // If we can't parse it, return null
  return null;
}

export async function registerTaskExtractor(): Promise<void> {
  const queue = await getQueue();

  await queue.work<ProcessBatchJob>(
    JobTypes.PROCESS_BATCH,
    async (jobs) => {
      for (const job of jobs) {
        try {
          const { connectionId, projectId, messageIds } = job.data;

        console.log(
          `[TaskExtractor] Processing batch: connection=${connectionId}, messages=${messageIds.length}`,
        );

        // 1. Fetch messages from database
        const messageBatch = await db
          .select()
          .from(messages)
          .where(inArray(messages.id, messageIds))
          .orderBy(messages.fonnteDate);

        if (messageBatch.length === 0) {
          console.warn(
            `[TaskExtractor] No messages found for IDs: ${messageIds.join(", ")}`,
          );
          return;
        }

        // 2. Fetch project details
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
        });

        if (!project) {
          console.error(
            `[TaskExtractor] Project not found: ${projectId}`,
          );
          return;
        }

        // 3. Fetch existing open tasks for context
        const existingTasks = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.projectId, projectId), eq(tasks.status, "open")))
          .limit(10);

        const existingTaskDescriptions = existingTasks.map((t) => t.description);

        // 4. Format messages for AI
        const formattedMessages = messageBatch.map((m) => ({
          sender: m.pushName,
          text: m.messageText,
          timestamp: m.fonnteDate,
        }));

        // 5. Call Kimi K2 for task extraction
        const projectContext = {
          name: project.name,
          description: project.description,
        };
        const userPrompt = buildTaskExtractionPrompt(
          projectContext,
          existingTaskDescriptions,
          formattedMessages,
        );

        const fullSystemPrompt = taskExtractionSystemPrompt + deadlineParsingGuidelines;

        const response = await llmChatCompletionsCreate({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: zodResponseFormat(
            DeadlineExtractionSchema,
            "task_extraction",
          ),
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          console.warn("[TaskExtractor] No content in AI response");
          return;
        }

        const result = JSON.parse(content);
        const extractedTasks = DeadlineExtractionSchema.parse(result);

        // Filter tasks by confidence threshold
        const filteredTasks = extractedTasks.tasks.filter(
          (task) => task.confidence >= CONFIDENCE_THRESHOLD
        );

        console.log(
          `[TaskExtractor] Extracted ${extractedTasks.tasks.length} tasks, ${filteredTasks.length} passed confidence threshold (${CONFIDENCE_THRESHOLD})`,
        );

        // 6. Insert tasks to database
        for (const task of filteredTasks) {
          // Parse deadline using natural language parser
          let deadline = parseNaturalLanguageDeadline(task.deadline);

          // Fallback: if LLM didn't extract deadline but message mentions time patterns,
          // try to extract from the original message text
          // Fallback: if LLM didn't extract deadline but message mentions time patterns,
          // try to extract from the original message text
          if (!deadline) {
            const allMessageText = messageBatch.map(m => m.messageText).join(" ");
            const fallbackDeadline = extractDeadlineFromText(allMessageText, task.description);
            if (fallbackDeadline) {
              deadline = fallbackDeadline;
            }
          }

          // Ensure deadline year is reasonable (not 2001, 1970, etc.)
          if (deadline) {
            const year = deadline.getFullYear();
            const currentYear = new Date().getFullYear();
            if (year < 2020) {
              // Create new date with correct year
              const month = deadline.getMonth();
              const day = deadline.getDate();
              const hours = deadline.getHours();
              const minutes = deadline.getMinutes();
              deadline = new Date(currentYear, month, day, hours, minutes, 0);
              // If the fixed date is in the past, use next year
              if (deadline < new Date()) {
                deadline = new Date(currentYear + 1, month, day, hours, minutes, 0);
              }
            }
          }

          await db.insert(tasks).values({
            projectId,
            messageId: messageBatch[0]?.id, // Link to first message in batch
            description: task.description,
            owner: task.assignee,
            deadline,
            status: "open",
            confidence: task.confidence,
          });

          console.log(
            `[TaskExtractor] Created task: ${task.description.slice(0, 50)}... (confidence: ${task.confidence}, deadline: ${deadline?.toISOString() || "none"})`,
          );
        }

        // 7. Mark messages as processed
        await db
          .update(messages)
          .set({ processed: true })
          .where(inArray(messages.id, messageIds));

        // 8. Enqueue risk detection job
        const riskJob: DetectRisksJob = { projectId };
        await queue.send(JobTypes.DETECT_RISKS, riskJob);

          console.log(
            `[TaskExtractor] Completed batch processing, enqueued risk detection`,
          );
        } catch (error) {
          console.error("[TaskExtractor] Error processing batch:", error);
          throw error; // Will trigger retry
        }
      }
    },
  );

  console.log("[TaskExtractor] Worker registered");
}
