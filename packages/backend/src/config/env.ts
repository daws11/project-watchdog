import "./dotenv";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .trim()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/project_watchdog"),
  LLM_PROVIDER: z.enum(["moonshot", "openai"]).default("moonshot"),
  MOONSHOT_API_KEY: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_DEFAULT_MODEL: z.string().optional().default("gpt-4.1-mini"),
  OPENAI_ADVANCED_MODEL: z.string().optional().default("gpt-4.1"),
  MOONSHOT_DEFAULT_MODEL: z.string().optional().default("moonshot-v1-32k"),
  MOONSHOT_ADVANCED_MODEL: z.string().optional().default("moonshot-v1-128k"),
  // Fonnte
  // Preferred new names:
  // - FONNTE_API_TOKEN: used as HTTP Authorization header for outbound API calls (send/validate/etc.)
  // - FONNTE_WEBHOOK_TOKEN: used to validate inbound webhook requests to /webhooks/fonnte/*
  FONNTE_API_TOKEN: z.string().optional().default(""),
  FONNTE_WEBHOOK_TOKEN: z.string().optional().default(""),
  // Legacy names (kept for backward compatibility):
  FONNTE_API_KEY: z.string().optional().default(""),
  FONNTE_TOKEN: z.string().optional().default(""),
  JWT_SECRET: z.string().optional().default(""),
  ENCRYPTION_KEY: z.string().optional().default(""),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  // Compatibility resolution:
  // - Historically, some environments stored the API token in FONNTE_TOKEN.
  // - We resolve a single "API token" for outbound requests using new -> old fallbacks.
  FONNTE_API_TOKEN:
    parsedEnv.FONNTE_API_TOKEN ||
    parsedEnv.FONNTE_API_KEY ||
    parsedEnv.FONNTE_TOKEN,
  // Webhook token should be explicit; fall back to legacy FONNTE_TOKEN.
  FONNTE_WEBHOOK_TOKEN:
    parsedEnv.FONNTE_WEBHOOK_TOKEN || parsedEnv.FONNTE_TOKEN,
};

export interface EnvValidationOptions {
  strict?: boolean;
}

export interface EnvValidationResult {
  warnings: string[];
  errors: string[];
}

export const validateEnvironment = (
  options: EnvValidationOptions = {},
): EnvValidationResult => {
  const strict = options.strict ?? false;
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!env.JWT_SECRET) {
    warnings.push("JWT_SECRET is missing.");
    if (strict) {
      errors.push("JWT_SECRET is required.");
    }
  } else if (env.JWT_SECRET.length < 32) {
    warnings.push("JWT_SECRET should be at least 32 characters.");
    if (strict) {
      errors.push("JWT_SECRET must be at least 32 characters.");
    }
  }

  if (env.LLM_PROVIDER === "moonshot") {
    if (!env.MOONSHOT_API_KEY) {
      warnings.push(
        "MOONSHOT_API_KEY is not set (required when LLM_PROVIDER=moonshot).",
      );
    }
  }

  if (env.LLM_PROVIDER === "openai") {
    if (!env.OPENAI_API_KEY) {
      warnings.push(
        "OPENAI_API_KEY is not set (required when LLM_PROVIDER=openai).",
      );
    }
  }

  if (!env.FONNTE_API_KEY) {
    // Keep legacy check, but prefer resolved token warnings below.
  }

  if (!env.FONNTE_API_TOKEN) {
    warnings.push(
      "FONNTE_API_TOKEN is not set (required for outbound WhatsApp sends; falls back to legacy FONNTE_API_KEY/FONNTE_TOKEN).",
    );
  } else if (!parsedEnv.FONNTE_API_TOKEN && parsedEnv.FONNTE_TOKEN) {
    warnings.push(
      "FONNTE_TOKEN is being used as the API token. Consider moving it to FONNTE_API_TOKEN and setting FONNTE_WEBHOOK_TOKEN separately.",
    );
  }

  if (!env.FONNTE_WEBHOOK_TOKEN) {
    warnings.push("FONNTE_WEBHOOK_TOKEN is not set.");
    if (strict) {
      errors.push("FONNTE_WEBHOOK_TOKEN is required to receive webhooks.");
    }
  }

  if (!env.ENCRYPTION_KEY) {
    warnings.push("ENCRYPTION_KEY is not set.");
    if (strict) {
      errors.push("ENCRYPTION_KEY is required to store API keys securely.");
    }
  }

  return { warnings, errors };
};
