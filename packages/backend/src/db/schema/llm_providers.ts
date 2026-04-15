import {
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const llmProviders = pgTable(
  "llm_providers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    baseUrl: text("base_url"),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    iv: text("iv").notNull(),
    authTag: text("auth_tag").notNull(),
    maskedKey: text("masked_key").notNull(),
    defaultModel: text("default_model").notNull(),
    advancedModel: text("advanced_model").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    lastTestAt: timestamp("last_test_at", { withTimezone: true }),
    lastTestOk: boolean("last_test_ok"),
    lastTestError: text("last_test_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Only one row may be active at a time.
    activeUniqueIdx: uniqueIndex("llm_providers_active_unique_idx")
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  }),
);

export type LlmProviderRow = typeof llmProviders.$inferSelect;
export type NewLlmProviderRow = typeof llmProviders.$inferInsert;
