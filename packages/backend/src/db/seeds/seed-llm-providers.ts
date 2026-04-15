import { sql } from "drizzle-orm";
import { env } from "../../config/env";
import { db } from "..";
import { llmProviders } from "../schema";
import { encryptSecret } from "../../utils/crypto";

function maskKey(raw: string): string {
  const key = raw.trim();
  if (!key) return "****";
  if (key.length <= 8) return "****";
  return `...${key.slice(-4)}`;
}

/**
 * Idempotent seed that copies the env-configured provider(s) into the
 * `llm_providers` table the first time the application starts against a
 * fresh DB. If the table already has ANY row (seeded or manually added),
 * this function is a no-op.
 *
 * The row matching `env.LLM_PROVIDER` is marked `isActive=true`.
 */
export async function seedLlmProvidersFromEnv(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(llmProviders);
  if (Number(count) > 0) {
    return;
  }

  const rows: Array<typeof llmProviders.$inferInsert> = [];

  if (env.OPENAI_API_KEY) {
    const enc = encryptSecret(env.OPENAI_API_KEY);
    rows.push({
      name: "OpenAI (seeded)",
      baseUrl: null,
      encryptedApiKey: enc.encryptedValue,
      iv: enc.iv,
      authTag: enc.authTag,
      maskedKey: maskKey(env.OPENAI_API_KEY),
      defaultModel: env.OPENAI_DEFAULT_MODEL,
      advancedModel: env.OPENAI_ADVANCED_MODEL,
      isActive: env.LLM_PROVIDER === "openai",
    });
  }

  if (env.MOONSHOT_API_KEY) {
    const enc = encryptSecret(env.MOONSHOT_API_KEY);
    rows.push({
      name: "Moonshot Kimi (seeded)",
      baseUrl: "https://api.moonshot.cn/v1",
      encryptedApiKey: enc.encryptedValue,
      iv: enc.iv,
      authTag: enc.authTag,
      maskedKey: maskKey(env.MOONSHOT_API_KEY),
      defaultModel: env.MOONSHOT_DEFAULT_MODEL,
      advancedModel: env.MOONSHOT_ADVANCED_MODEL,
      isActive: env.LLM_PROVIDER === "moonshot",
    });
  }

  if (rows.length === 0) {
    console.log(
      "[seed-llm-providers] No env API keys found, skipping seed. Configure providers at Settings → LLM Providers.",
    );
    return;
  }

  // Guard: if neither row is marked active (e.g. env mis-set), activate the
  // first one so the system has a working default.
  if (!rows.some((r) => r.isActive)) {
    rows[0].isActive = true;
  }

  await db.insert(llmProviders).values(rows);
  console.log(
    `[seed-llm-providers] Seeded ${rows.length} provider row(s) from env.`,
  );
}
