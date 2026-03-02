import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { processingRules } from "./processing_rules";

export const processingRuns = pgTable("processing_runs", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id")
    .notNull()
    .references(() => processingRules.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // 'running' | 'success' | 'error'
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  output: jsonb("output"),
  error: text("error"),
});
