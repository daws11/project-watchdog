import {
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    narrative: text("narrative").notNull(),
    newTasks: integer("new_tasks").notNull().default(0),
    resolvedTasks: integer("resolved_tasks").notNull().default(0),
    activeRisks: integer("active_risks").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectDateUniqueIdx: uniqueIndex("reports_project_date_unique").on(
      table.projectId,
      table.date,
    ),
  }),
);
