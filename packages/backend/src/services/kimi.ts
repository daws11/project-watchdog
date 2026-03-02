import OpenAI from "openai";
import { env } from "../config/env";

// Kimi K2 client using OpenAI-compatible API
export const kimi = new OpenAI({
  apiKey: env.MOONSHOT_API_KEY,
  baseURL: "https://api.moonshot.cn/v1",
});

// Available Kimi models
export const KimiModels = {
  K2_8K: "moonshot-v1-8k",
  K2_32K: "moonshot-v1-32k",
  K2_128K: "moonshot-v1-128k",
} as const;

// Default model for task extraction (cost-effective)
export const DEFAULT_MODEL = KimiModels.K2_32K;

// Model for reports and complex analysis
export const ADVANCED_MODEL = KimiModels.K2_128K;
