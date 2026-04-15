import OpenAI from "openai";
import { desc, eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { apiKeys, llmProviders } from "../db/schema";
import { decryptSecret } from "../utils/crypto";

// Sentinel strings used by callers as `model: DEFAULT_MODEL` / `model: ADVANCED_MODEL`.
// `llmChatCompletionsCreate` intercepts these and swaps them for the real model
// name of the currently active provider at call time. Plain literal strings stay
// untouched and pass through — existing tests keep working.
export const DEFAULT_MODEL = "__provider_default__" as const;
export const ADVANCED_MODEL = "__provider_advanced__" as const;

export type LegacyLlmProvider = "moonshot" | "openai";

interface ResolvedProvider {
  id: number | null; // null = env fallback
  source: "db" | "env";
  name: string;
  baseUrl: string | null;
  apiKey: string;
  defaultModel: string;
  advancedModel: string;
}

let cachedProvider: (ResolvedProvider & { expiresAtMs: number }) | null = null;
const CACHE_TTL_MS = 60_000;

export function invalidateProviderCache(): void {
  cachedProvider = null;
}

function maskKey(raw: string): string {
  const value = raw.trim();
  if (!value) return "****";
  if (value.length <= 8) return "****";
  return `...${value.slice(-4)}`;
}

async function loadFromDb(): Promise<ResolvedProvider | null> {
  const [row] = await db
    .select()
    .from(llmProviders)
    .where(eq(llmProviders.isActive, true))
    .limit(1);
  if (!row) return null;
  try {
    const apiKey = decryptSecret(row.encryptedApiKey, row.iv, row.authTag);
    return {
      id: row.id,
      source: "db",
      name: row.name,
      baseUrl: row.baseUrl,
      apiKey,
      defaultModel: row.defaultModel,
      advancedModel: row.advancedModel,
    };
  } catch (error) {
    console.warn(
      `[LLM] Failed to decrypt provider row id=${row.id}: ${String(error)}. Falling back to env.`,
    );
    return null;
  }
}

async function loadLegacyApiKeyFromDb(
  service: string,
): Promise<{ apiKey: string; id: number } | null> {
  const latest = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.service, service),
    orderBy: desc(apiKeys.createdAt),
  });
  if (!latest?.encryptedKey || !latest.iv || !latest.authTag) return null;
  try {
    return {
      apiKey: decryptSecret(latest.encryptedKey, latest.iv, latest.authTag),
      id: latest.id,
    };
  } catch (error) {
    console.warn(
      `[LLM] Failed to decrypt legacy api_keys row for service=${service}: ${String(error)}`,
    );
    return null;
  }
}

async function loadFromEnv(): Promise<ResolvedProvider | null> {
  const provider: LegacyLlmProvider = env.LLM_PROVIDER;

  // Legacy behaviour: api_keys table (service='openai'|'moonshot') still wins
  // over env vars. Keeps the pre-existing migration path working.
  const legacy = await loadLegacyApiKeyFromDb(provider);
  if (legacy) {
    if (provider === "openai") {
      return {
        id: null,
        source: "env",
        name: "OpenAI (legacy)",
        baseUrl: null,
        apiKey: legacy.apiKey,
        defaultModel: env.OPENAI_DEFAULT_MODEL,
        advancedModel: env.OPENAI_ADVANCED_MODEL,
      };
    }
    return {
      id: null,
      source: "env",
      name: "Moonshot (legacy)",
      baseUrl: "https://api.moonshot.cn/v1",
      apiKey: legacy.apiKey,
      defaultModel: env.MOONSHOT_DEFAULT_MODEL,
      advancedModel: env.MOONSHOT_ADVANCED_MODEL,
    };
  }

  if (provider === "openai" && env.OPENAI_API_KEY) {
    return {
      id: null,
      source: "env",
      name: "OpenAI (env)",
      baseUrl: null,
      apiKey: env.OPENAI_API_KEY,
      defaultModel: env.OPENAI_DEFAULT_MODEL,
      advancedModel: env.OPENAI_ADVANCED_MODEL,
    };
  }
  if (provider === "moonshot" && env.MOONSHOT_API_KEY) {
    return {
      id: null,
      source: "env",
      name: "Moonshot (env)",
      baseUrl: "https://api.moonshot.cn/v1",
      apiKey: env.MOONSHOT_API_KEY,
      defaultModel: env.MOONSHOT_DEFAULT_MODEL,
      advancedModel: env.MOONSHOT_ADVANCED_MODEL,
    };
  }
  return null;
}

export async function resolveActiveProvider(): Promise<ResolvedProvider> {
  const now = Date.now();
  if (cachedProvider && cachedProvider.expiresAtMs > now) {
    return cachedProvider;
  }

  const dbProvider = await loadFromDb();
  const resolved = dbProvider ?? (await loadFromEnv());
  if (!resolved) {
    throw new Error(
      "[LLM] No active LLM provider configured. Add one at Settings → LLM Providers, or set LLM_PROVIDER + *_API_KEY env vars.",
    );
  }

  cachedProvider = { ...resolved, expiresAtMs: now + CACHE_TTL_MS };
  return resolved;
}

function createClient(provider: ResolvedProvider): OpenAI {
  return new OpenAI({
    apiKey: provider.apiKey,
    ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
  });
}

export async function llmChatCompletionsCreate(params: any): Promise<any> {
  const provider = await resolveActiveProvider();

  // Resolve model sentinels to concrete names from the active provider.
  const rawModel = params?.model;
  let model = rawModel;
  if (rawModel === DEFAULT_MODEL) model = provider.defaultModel;
  else if (rawModel === ADVANCED_MODEL) model = provider.advancedModel;

  const client = createClient(provider);
  const response = await client.chat.completions.create({
    stream: false,
    ...params,
    model,
  });

  // Best-effort last_used_at updates (non-blocking).
  if (provider.source === "db" && provider.id != null) {
    const providerId = provider.id;
    void (async () => {
      try {
        await db
          .update(llmProviders)
          .set({ lastUsedAt: new Date() })
          .where(eq(llmProviders.id, providerId));
      } catch (error) {
        console.warn(
          `[LLM] Failed to update last_used_at for llm_providers.id=${providerId}: ${String(error)}`,
        );
      }
    })();
  } else {
    console.log(
      `[LLM] Using env-based key (${provider.name}, ${maskKey(provider.apiKey)}).`,
    );
  }

  return response;
}

/**
 * Ephemeral test call used by the Settings UI "Test" button. Does NOT touch
 * the resolved-provider cache or update last_used_at.
 */
export async function testProviderConnection(input: {
  baseUrl: string | null;
  apiKey: string;
  defaultModel: string;
}): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    const client = new OpenAI({
      apiKey: input.apiKey,
      ...(input.baseUrl ? { baseURL: input.baseUrl } : {}),
    });
    await client.chat.completions.create({
      model: input.defaultModel,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
      temperature: 0,
      stream: false,
    });
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Kept as a compatibility shim for any legacy code/tests that read
// `LLM_PROVIDER` directly. The real truth is in the DB resolver above.
export const LLM_PROVIDER: LegacyLlmProvider = env.LLM_PROVIDER;
