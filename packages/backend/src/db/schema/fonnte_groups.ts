import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const fonnteGroups = pgTable(
  "fonnte_groups",
  {
    id: serial("id").primaryKey(),
    groupId: text("group_id").notNull(),
    name: text("name").notNull(),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    groupIdUnique: uniqueIndex("fonnte_groups_group_id_unique").on(table.groupId),
  }),
);
