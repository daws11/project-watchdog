import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const processingRules = pgTable("processing_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  schedule: text("schedule").notNull(), // Cron format
  channelIds: text("channel_ids").array().notNull(), // Array of connection IDs
  prompt: text("prompt").notNull(),
  action: text("action").notNull(), // 'extract_tasks' | 'update_profiles' | 'both'
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
