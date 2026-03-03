import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  channelType: text("channel_type").notNull(), // 'whatsapp' | 'email' | 'google_meet' | 'webhook'
  label: text("label").notNull(),
  identifier: text("identifier").notNull(), // Fonnte group ID for WhatsApp
  description: text("description"),
  descriptionSource: text("description_source").default("ai"), // 'user' | 'ai'
  priorities: text("priorities"),
  prioritiesSource: text("priorities_source").default("ai"), // 'user' | 'ai'
  customPrompt: text("custom_prompt"),
  customPromptSource: text("custom_prompt_source").default("ai"), // 'user' | 'ai'
  status: text("status").notNull().default("active"), // 'active' | 'paused' | 'error'
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  messagesProcessed: integer("messages_processed").notNull().default(0),
  error: text("error"),
  reportTime: text("report_time").notNull().default("18:00"), // HH:MM format
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
