import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const waIngestorCommands = pgTable("wa_ingestor_commands", {
  id: serial("id").primaryKey(),
  command: text("command").notNull(), // 'logout' | 'reconnect'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

