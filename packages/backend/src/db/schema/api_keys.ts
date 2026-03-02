import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(), // 'openai' | 'fonnte' | 'smtp'
  maskedKey: text("masked_key").notNull(), // Only last 4 chars visible
  encryptedKey: text("encrypted_key"),
  iv: text("iv"),
  authTag: text("auth_tag"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
