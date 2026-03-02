import OpenAI from "openai";
import { desc, eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { apiKeys } from "../db/schema";
import { decryptSecret } from "../utils/crypto";

export type LlmProvider = "moonshot" | "openai";

export const LLM_PROVIDER: LlmProvider = env.LLM_PROVIDER;

type ProviderConfig = {
  dbServiceName: string;
  baseURL?: string;
  defaultModel: string;
  advancedModel: string;
};

const PROVIDERS: Record<LlmProvider, ProviderConfig> = {
  moonshot: {
    dbServiceName: "moonshot",
    baseURL: "https://api.moonshot.cn/v1",
    defaultModel: env.MOONSHOT_DEFAULT_MODEL,
    advancedModel: env.MOONSHOT_ADVANCED_MODEL,
  },
  openai: {
    dbServiceName: "openai",
    defaultModel: env.OPENAI_DEFAULT_MODEL,
    advancedModel: env.OPENAI_ADVANCED_MODEL,
  },
};

export const DEFAULT_MODEL = PROVIDERS[LLM_PROVIDER].defaultModel;
export const ADVANCED_MODEL = PROVIDERS[LLM_PROVIDER].advancedModel;

type ResolvedKey = {
  keyId: number | null;
  apiKey: string;
};

let cachedKey:
  | (ResolvedKey & { provider: LlmProvider; expiresAtMs: number })
  | null = null;

function maskKey(raw: string): string {
  const value = raw.trim();
  if (!value) return "****";
  if (value.length <= 8) return "****";
  return `...${value.slice(-4)}`;
}

async function resolveApiKey(provider: LlmProvider): Promise<ResolvedKey> {
  const now = Date.now();
  if (
    cachedKey &&
    cachedKey.provider === provider &&
    cachedKey.expiresAtMs > now
  ) {
    return { keyId: cachedKey.keyId, apiKey: cachedKey.apiKey };
  }

  const dbService = PROVIDERS[provider].dbServiceName;

  // Prefer latest key stored in database (encrypted).
  const latest = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.service, dbService),
    orderBy: desc(apiKeys.createdAt),
  });

  if (latest?.encryptedKey && latest.iv && latest.authTag) {
    try {
      const apiKey = decryptSecret(latest.encryptedKey, latest.iv, latest.authTag);
      cachedKey = {
        provider,
        keyId: latest.id,
        apiKey,
        // Short TTL so new keys in Settings are picked up quickly.
        expiresAtMs: now + 60_000,
      };
      return { keyId: latest.id, apiKey };
    } catch (error) {
      console.warn(
        `[LLM] Failed to decrypt ${dbService} API key from database; falling back to env. ${String(
          error,
        )}`,
      );
    }
  }

  // Fallback to env vars (legacy / local dev).
  const envKey = provider === "openai" ? env.OPENAI_API_KEY : env.MOONSHOT_API_KEY;
  if (envKey) {
    cachedKey = {
      provider,
      keyId: null,
      apiKey: envKey,
      expiresAtMs: now + 60_000,
    };
    return { keyId: null, apiKey: envKey };
  }

  const envVarName = provider === "openai" ? "OPENAI_API_KEY" : "MOONSHOT_API_KEY";
  throw new Error(
    `[LLM] API key is not configured for provider=${provider}. Set ${envVarName} or save an encrypted key via Settings (service='${dbService}').`,
  );
}

function createClient(provider: LlmProvider, apiKey: string): OpenAI {
  const baseURL = PROVIDERS[provider].baseURL;
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

export async function llmChatCompletionsCreate(
  params: any,
): Promise<any> {
  const provider = LLM_PROVIDER;
  const { keyId, apiKey } = await resolveApiKey(provider);
  const client = createClient(provider, apiKey);

  const response = await client.chat.completions.create({
    stream: false,
    ...params,
  });

  if (keyId) {
    try {
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyId));
    } catch (error) {
      console.warn(
        `[LLM] Failed to update last_used_at for keyId=${keyId}: ${String(error)}`,
      );
    }
  } else {
    // Best-effort log to help debugging env-based configuration.
    console.log(
      `[LLM] Using env-based key (${provider}, ${maskKey(apiKey)}).`,
    );
  }

  return response;
}

