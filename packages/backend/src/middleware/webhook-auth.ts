import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/**
 * Middleware to validate internal ingest token for whatsapp-web.js ingestor
 */
export const validateIngestToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const headerToken = req.headers["x-ingest-token"];
    const token = typeof headerToken === "string" ? headerToken : undefined;

    if (!env.WHATSAPP_INGEST_TOKEN) {
      console.error("[IngestAuth] WHATSAPP_INGEST_TOKEN not configured");
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    if (token !== env.WHATSAPP_INGEST_TOKEN) {
      console.warn(
        `[IngestAuth] Invalid ingest token attempt from IP: ${req.ip}`,
      );
      res.status(401).json({ error: "Unauthorized: Invalid ingest token" });
      return;
    }

    next();
  } catch (error) {
    console.error("[IngestAuth] Ingest validation error:", error);
    res.status(500).json({ error: "Ingest validation failed" });
  }
};
