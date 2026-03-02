import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const risks = pgTable("risks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'deadline' | 'stagnation' | 'blockers' | 'sentiment'
  severity: text("severity").notNull(), // 'low' | 'medium' | 'high' | 'critical'
  explanation: text("explanation").notNull(),
  recommendation: text("recommendation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
