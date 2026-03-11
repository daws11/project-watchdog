import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const waIngestorCommands = pgTable("wa_ingestor_commands", {
  id: serial("id").primaryKey(),
  command: text("command").notNull(), // 'logout' | 'reconnect' | 'sync_groups' | 'send_message'
  payload: jsonb("payload"), // For 'send_message': { groupId: string, messageText: string }
  attempts: integer("attempts").notNull().default(0), // Number of send attempts for retry logic
  availableAt: timestamp("available_at", { withTimezone: true }), // When command should become available for processing (used for backoff)
  lastError: text("last_error"), // Last error message on failure
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }), // Set when successfully processed
});

