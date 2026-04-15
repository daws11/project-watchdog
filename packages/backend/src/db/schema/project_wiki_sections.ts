import {
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const projectWikiSections = pgTable(
  "project_wiki_sections",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    tokenEstimate: integer("token_estimate").notNull().default(0),
    sourceMessageIds: jsonb("source_message_ids").notNull().default([]),
    confidence: real("confidence").notNull().default(1.0),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by").notNull().default("llm"),
    updatedBy: text("updated_by").notNull().default("llm"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectKindTitleIdx: uniqueIndex("project_wiki_sections_pkt_idx").on(
      table.projectId,
      table.kind,
      table.title,
    ),
  }),
);

export type WikiSectionRow = typeof projectWikiSections.$inferSelect;
export type NewWikiSectionRow = typeof projectWikiSections.$inferInsert;
