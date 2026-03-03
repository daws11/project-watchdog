import { integer, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { messages } from "./messages";
import { projects } from "./projects";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  messageId: integer("message_id").references(() => messages.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  owner: text("owner"), // Assignee name
  deadline: timestamp("deadline", { withTimezone: true }),
  status: text("status").notNull().default("open"), // 'open' | 'done' | 'blocked' | 'merged'
  confidence: real("confidence").notNull().default(1.0), // AI confidence score 0.0-1.0
  // Task deduplication fields
  similarityHash: text("similarity_hash"), // Hash untuk fast exact match lookup
  parentTaskId: integer("parent_task_id"), // Reference to parent task (if merged)
  mergedTaskIds: jsonb("merged_task_ids").default([]), // Array of merged task IDs
  // Task evolution tracking
  previousDescription: text("previous_description"), // Previous description before update
  previousDeadline: timestamp("previous_deadline", { withTimezone: true }), // Previous deadline
  updateCount: integer("update_count").default(0), // Number of times task was updated
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
