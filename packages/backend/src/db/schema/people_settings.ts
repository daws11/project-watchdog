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
  priorities: text("priorities"),
  customPrompt: text("custom_prompt"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
