import { Router } from "express";
import { ingestWhatsappGroupText } from "../ingest/ingest-whatsapp-group-text";

interface FonnteWebhookPayload {
  device?: string;
  message: string;
  sender: string;
  pushname?: string;
  is_group: boolean;
  group?: string;
  date: number;
  type?: string;
}

const router = Router();

// Fonnte (and proxies) may send GET/HEAD to validate webhook reachability.
// We respond 200 here; the actual webhook delivery uses POST /receive.
router.get("/receive", (_req, res) => {
  res.status(200).json({ ok: true });
});

router.head("/receive", (_req, res) => {
  res.status(200).end();
});

router.post("/receive", async (req, res) => {
  try {
    const payload = req.body as FonnteWebhookPayload;

    // 1. Validate payload shape; return 200 to avoid webhook retries on malformed input.
    if (
      !payload ||
      typeof payload.message !== "string" ||
      typeof payload.sender !== "string" ||
      typeof payload.is_group !== "boolean" ||
      typeof payload.date !== "number"
    ) {
      return res.status(200).json({ message: "Invalid payload ignored" });
    }

    if (payload.message.length === 0) {
      return res.status(200).json({ message: "Empty message ignored" });
    }

    if (payload.type !== "text") {
      return res.status(200).json({ message: "Non-text message ignored" });
    }

    // 2. Only process group messages
    if (!payload.is_group || typeof payload.group !== "string") {
      return res.status(200).json({ message: "Non-group message ignored" });
    }

    const result = await ingestWhatsappGroupText({
      groupId: payload.group,
      sender: payload.sender,
      pushName: payload.pushname || "Unknown",
      messageText: payload.message,
      timestampMs: payload.date * 1000,
      hashTimestampPart: payload.date, // seconds (legacy dedupe compatibility)
    });

    if (result.outcome === "inserted") {
      console.log(
        `[Webhook] Message received and stored: ${result.messageHash.slice(0, 8)}... from ${payload.pushname}`,
      );
      return res.status(200).json({ success: true });
    }

    if (result.outcome === "duplicate") {
      return res.status(200).json({ message: result.reason });
    }

    if (result.reason === "Rate limited") {
      console.warn(`[Webhook] Group rate limited: ${payload.group}`);
    }

    return res.status(200).json({ message: result.reason });
  } catch (error) {
    console.error("[Webhook] Error processing message:", error);
    // Still return 200 to prevent Fonnte from retrying
    return res.status(200).json({ error: "Internal error" });
  }
});

export { router as fonnteWebhookRouter };
