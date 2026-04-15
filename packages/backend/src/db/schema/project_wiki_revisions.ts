import {
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { projectWikiSections } from "./project_wiki_sections";

export const projectWikiRevisions = pgTable("project_wiki_revisions", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id")
    .notNull()
    .references(() => projectWikiSections.id, { onDelete: "cascade" }),
  previousContent: text("previous_content"),
  newContent: text("new_content").notNull(),
  diffSummary: text("diff_summary"),
  sourceMessageIds: jsonb("source_message_ids").notNull().default([]),
  confidence: real("confidence").notNull().default(1.0),
  actor: text("actor").notNull(),
  reviewState: text("review_state").notNull().default("pending"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WikiRevisionRow = typeof projectWikiRevisions.$inferSelect;
export type NewWikiRevisionRow = typeof projectWikiRevisions.$inferInsert;
