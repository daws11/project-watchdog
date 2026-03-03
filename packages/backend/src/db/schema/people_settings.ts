import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const peopleSettings = pgTable("people_settings", {
  id: serial("id").primaryKey(),
  personId: text("person_id").notNull().unique(),
  name: text("name"),
  aliases: text("aliases").array().notNull().default([]),
  email: text("email"),
  phone: text("phone"),
  roleName: text("role_name"),
  roleDescription: text("role_description"),
  roleDescriptionSource: text("role_description_source").default("ai"), // 'user' | 'ai'
  priorities: text("priorities"),
  prioritiesSource: text("priorities_source").default("ai"), // 'user' | 'ai'
  customPrompt: text("custom_prompt"),
  customPromptSource: text("custom_prompt_source").default("ai"), // 'user' | 'ai'
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
