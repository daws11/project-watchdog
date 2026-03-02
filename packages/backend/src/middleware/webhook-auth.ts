import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/**
 * Middleware to validate Fonnte webhook token
 */
export const validateFonnteWebhook = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const queryToken = req.query.token;
    const headerToken = req.headers["x-fonnte-token"];
    const token =
      (typeof queryToken === "string" ? queryToken : undefined) ||
      (typeof headerToken === "string" ? headerToken : undefined);

    if (!env.FONNTE_WEBHOOK_TOKEN) {
      console.error("[WebhookAuth] FONNTE_WEBHOOK_TOKEN not configured");
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    if (token !== env.FONNTE_WEBHOOK_TOKEN) {
      console.warn(
        `[WebhookAuth] Invalid Fonnte webhook token attempt from IP: ${req.ip}`,
      );
      res.status(401).json({ error: "Unauthorized: Invalid webhook token" });
      return;
    }

    next();
  } catch (error) {
    console.error("[WebhookAuth] Webhook validation error:", error);
    res.status(500).json({ error: "Webhook validation failed" });
  }
};
