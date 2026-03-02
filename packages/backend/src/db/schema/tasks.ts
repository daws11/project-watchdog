import { integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
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
  status: text("status").notNull().default("open"), // 'open' | 'done' | 'blocked'
  confidence: real("confidence").notNull().default(1.0), // AI confidence score 0.0-1.0
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
