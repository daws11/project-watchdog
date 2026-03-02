import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { connections } from "./connections";
import { projects } from "./projects";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sender: text("sender").notNull(), // WhatsApp number
  pushName: text("push_name").notNull(), // Sender display name
  messageText: text("message_text").notNull(),
  messageHash: text("message_hash").notNull().unique(), // SHA-256 for deduplication
  isGroup: boolean("is_group").notNull().default(true),
  fonnteDate: timestamp("fonnte_date", { withTimezone: true }).notNull(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
