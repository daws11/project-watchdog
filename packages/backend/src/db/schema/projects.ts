import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  descriptionSource: text("description_source").default("ai"), // 'user' | 'ai'
  priorities: text("priorities"),
  prioritiesSource: text("priorities_source").default("ai"), // 'user' | 'ai'
  customPrompt: text("custom_prompt"),
  customPromptSource: text("custom_prompt_source").default("ai"), // 'user' | 'ai'
  healthScore: integer("health_score").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
