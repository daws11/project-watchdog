import "./dotenv";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_INGEST_URL: z
    .string()
    .trim()
    .min(1)
    .default("http://127.0.0.1:3001/ingest/whatsapp-web"),
  WHATSAPP_INGEST_TOKEN: z.string().trim().min(1),
  WA_SESSION_DIR: z.string().trim().min(1).default(".wa-session"),
  WA_PUPPETEER_EXECUTABLE_PATH: z.string().trim().optional(),
  WA_HEADLESS: z.coerce.boolean().default(true),
  WA_COMMAND_POLL_MS: z.coerce.number().int().positive().default(3000),
  WA_STATUS_HEARTBEAT_MS: z.coerce.number().int().positive().default(10000),
});

export const env = envSchema.parse(process.env);

