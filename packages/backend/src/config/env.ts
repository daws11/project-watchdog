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
  // WhatsApp Web ingestion (whatsapp-web.js)
  WHATSAPP_INGEST_TOKEN: z.string().optional().default(""),
  JWT_SECRET: z.string().optional().default(""),
  ENCRYPTION_KEY: z.string().optional().default(""),
});

const parsedEnv = envSchema.parse(process.env);

export const env = parsedEnv;

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

  if (!env.WHATSAPP_INGEST_TOKEN) {
    warnings.push("WHATSAPP_INGEST_TOKEN is not set (required for WhatsApp Web integration).");
    if (strict) {
      errors.push("WHATSAPP_INGEST_TOKEN is required for WhatsApp Web integration.");
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
