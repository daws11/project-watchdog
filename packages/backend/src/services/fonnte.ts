import { env } from "../config/env";
import { db } from "../db";
import { apiKeys } from "../db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { decryptSecret } from "../utils/crypto";

interface SendMessagePayload {
  target: string; // Group ID or phone number
  message: string;
}

interface SendMessageResponse {
  status: boolean;
  message?: string;
  reason?: string;
  detail?: string;
}

interface UpdateGroupListResponse {
  status: boolean;
  detail?: string;
  reason?: string;
}

export interface FonnteWhatsappGroup {
  id: string;
  name: string;
}

interface GetGroupListResponse {
  status: boolean;
  detail?: string;
  reason?: string;
  data?: FonnteWhatsappGroup[];
}

class FonnteService {
  private readonly baseURL = "https://api.fonnte.com";

  private async getApiToken(): Promise<string> {
    const latestKey = await db
      .select()
      .from(apiKeys)
      .where(sql`lower(${apiKeys.service}) = 'fonnte'`)
      .orderBy(desc(apiKeys.createdAt))
      .limit(1);

    const key = latestKey[0];
    if (key?.encryptedKey && key.iv && key.authTag) {
      return decryptSecret(key.encryptedKey, key.iv, key.authTag);
    }

    // Fallback for legacy environments using env key.
    if (env.FONNTE_API_TOKEN) {
      return env.FONNTE_API_TOKEN;
    }

    throw new Error("Fonnte API token is not configured");
  }

  private async postForm<T>(
    path: string,
    token: string,
    payload?: Record<string, string>,
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(payload || {}),
    });

    if (!response.ok) {
      throw new Error(`Fonnte API error: ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  async updateWhatsappGroupList(): Promise<UpdateGroupListResponse> {
    const apiToken = await this.getApiToken();
    let usedToken = apiToken;
    let result = await this.postForm<UpdateGroupListResponse>(
      "/fetch-group",
      usedToken,
    );
    const isTokenInvalid = (response: {
      detail?: string;
      reason?: string;
    }): boolean => {
      const message = `${response.detail || ""} ${response.reason || ""}`
        .trim()
        .toLowerCase();
      return message.includes("token invalid");
    };

    if (
      !result.status &&
      isTokenInvalid(result) &&
      env.FONNTE_TOKEN &&
      env.FONNTE_TOKEN !== usedToken
    ) {
      usedToken = env.FONNTE_TOKEN;
      result = await this.postForm<UpdateGroupListResponse>("/fetch-group", usedToken);
    }

    if (!result.status) {
      throw new Error(
        result.detail || result.reason || "Failed to update WhatsApp group list",
      );
    }

    return result;
  }

  async getWhatsappGroupList(): Promise<FonnteWhatsappGroup[]> {
    const apiToken = await this.getApiToken();
    let usedToken = apiToken;
    let result = await this.postForm<GetGroupListResponse>(
      "/get-whatsapp-group",
      usedToken,
    );
    const isTokenInvalid = (response: {
      detail?: string;
      reason?: string;
    }): boolean => {
      const message = `${response.detail || ""} ${response.reason || ""}`
        .trim()
        .toLowerCase();
      return message.includes("token invalid");
    };

    if (
      !result.status &&
      isTokenInvalid(result) &&
      env.FONNTE_TOKEN &&
      env.FONNTE_TOKEN !== usedToken
    ) {
      usedToken = env.FONNTE_TOKEN;
      result = await this.postForm<GetGroupListResponse>(
        "/get-whatsapp-group",
        usedToken,
      );
    }

    if (!result.status) {
      throw new Error(
        result.detail || result.reason || "Failed to get WhatsApp group list",
      );
    }

    return (result.data || []).filter(
      (item) => typeof item.id === "string" && typeof item.name === "string",
    );
  }

  async sendMessage(
    target: string,
    message: string,
  ): Promise<SendMessageResponse> {
    const apiToken = await this.getApiToken();
    if (!target.trim()) {
      throw new Error("Fonnte target must not be empty");
    }
    if (!message.trim()) {
      throw new Error("Fonnte message must not be empty");
    }

    const sendWithToken = async (token: string): Promise<SendMessageResponse> => {
      const payload: SendMessagePayload = { target, message };
      return this.postForm<SendMessageResponse>("/send", token, {
        target: payload.target,
        message: payload.message,
      });
    };

    try {
      let usedToken = apiToken;
      let data = await sendWithToken(usedToken);

      // Compatibility fallback:
      // Some environments historically stored the Fonnte API token in FONNTE_TOKEN.
      // If the primary token is invalid and FONNTE_TOKEN differs, retry once.
      if (
        !data.status &&
        data.reason === "invalid token" &&
        env.FONNTE_TOKEN &&
        env.FONNTE_TOKEN !== usedToken
      ) {
        usedToken = env.FONNTE_TOKEN;
        data = await sendWithToken(usedToken);
      }

      if (!data.status) {
        throw new Error(
          data.reason ||
            data.message ||
            "Fonnte API returned unsuccessful status",
        );
      }

      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(
          and(
            eq(apiKeys.service, "fonnte"),
            eq(apiKeys.maskedKey, latestMask(usedToken)),
          ),
        );

      return data;
    } catch (error) {
      console.error("[Fonnte] Failed to send message:", error);
      throw error;
    }
  }
}

function latestMask(raw: string): string {
  const value = raw.trim();
  if (!value) return "****";
  if (value.length <= 8) return "****";
  return `...${value.slice(-4)}`;
}

export const fonnteService = new FonnteService();
