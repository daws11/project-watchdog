import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const smtpSettings = pgTable("smtp_settings", {
  id: serial("id").primaryKey(),
  host: text("host").notNull().default(""),
  port: integer("port").notNull().default(587),
  username: text("username").notNull().default(""),
  password: text("password").notNull().default(""),
  fromAddress: text("from_address").notNull().default(""),
  encryption: text("encryption").notNull().default("starttls"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
