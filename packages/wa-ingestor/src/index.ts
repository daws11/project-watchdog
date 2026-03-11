import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import qrcode from "qrcode-terminal";
import WhatsAppWeb from "whatsapp-web.js";
import { env } from "./config/env";

type RuntimeState =
  | "starting"
  | "qr_required"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "auth_failure"
  | "error";

type BackendCommand = "logout" | "reconnect" | "sync_groups" | "send_message";

interface SendMessagePayload {
  groupId: string;
  messageText: string;
}

interface CommandEnvelope {
  id: number;
  command: BackendCommand;
  payload?: SendMessagePayload;
}

interface StatusPayload {
  state: RuntimeState;
  qr?: string;
  info?: string;
  updatedAtMs: number;
}

interface AckResult {
  ok: boolean;
  error?: string;
}

function detectChromeExecutable(): string | undefined {
  const candidates: string[] = [];

  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    );
  } else if (process.platform === "linux") {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
    );
  } else if (process.platform === "win32") {
    candidates.push(
      "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
      "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
      "C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
      "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
    );
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function buildIngestUrl(suffix: string): string {
  const base = env.BACKEND_INGEST_URL.endsWith("/")
    ? env.BACKEND_INGEST_URL
    : `${env.BACKEND_INGEST_URL}/`;
  return new URL(suffix, base).toString();
}

const STATUS_URL = buildIngestUrl("status");
const COMMANDS_URL = buildIngestUrl("commands");
const GROUPS_URL = buildIngestUrl("groups");

async function postJson(url: string, payload: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ingest-token": env.WHATSAPP_INGEST_TOKEN,
    },
    body: JSON.stringify(payload),
  });
}

async function postMessageToBackend(payload: unknown): Promise<Response> {
  return postJson(env.BACKEND_INGEST_URL, payload);
}

async function postGroupsToBackend(payload: unknown): Promise<Response> {
  return postJson(GROUPS_URL, payload);
}

async function postStatusToBackend(payload: StatusPayload): Promise<void> {
  try {
    const res = await postJson(STATUS_URL, payload);
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      console.warn(
        `[WA Ingestor] Status push failed (${res.status}): ${bodyText}`,
      );
    }
  } catch (error) {
    console.warn("[WA Ingestor] Status push error:", error);
  }
}

async function getPendingCommands(): Promise<CommandEnvelope[]> {
  const res = await fetch(COMMANDS_URL, {
    headers: {
      "x-ingest-token": env.WHATSAPP_INGEST_TOKEN,
    },
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    console.warn(
      `[WA Ingestor] Command poll failed (${res.status}): ${bodyText}`,
    );
    return [];
  }
  const data = (await res.json().catch(() => ({}))) as {
    commands?: Array<{ id?: number; command?: string; payload?: unknown }>;
  };
  const commands = data.commands ?? [];
  return commands
    .filter(
      (item): item is { id: number; command: string; payload?: unknown } =>
        typeof item.id === "number" && typeof item.command === "string",
    )
    .filter(
      (item): item is CommandEnvelope => {
        const validCommand =
          item.command === "logout" ||
          item.command === "reconnect" ||
          item.command === "sync_groups" ||
          item.command === "send_message";

        if (!validCommand) return false;

        // Validate send_message payload
        if (item.command === "send_message") {
          const payload = item.payload as Record<string, unknown> | undefined;
          const validPayload =
            payload &&
            typeof payload.groupId === "string" &&
            typeof payload.messageText === "string" &&
            payload.groupId.length > 0 &&
            payload.messageText.length > 0;

          if (!validPayload) {
            console.warn(`[WA Ingestor] Skipping send_message ${item.id}: invalid payload`);
            return false;
          }
        }

        return true;
      },
    )
    .map((item) => ({
      id: item.id,
      command: item.command as BackendCommand,
      payload: item.command === "send_message"
        ? (item.payload as SendMessagePayload)
        : undefined,
    }));
}

async function ackCommand(commandId: number, result: AckResult): Promise<void> {
  await postJson(`${COMMANDS_URL}/${commandId}/ack`, result);
}

function resolveSessionDir(): string {
  return path.isAbsolute(env.WA_SESSION_DIR)
    ? env.WA_SESSION_DIR
    : path.resolve(process.cwd(), env.WA_SESSION_DIR);
}

async function main() {
  const sessionDir = resolveSessionDir();
  console.log(`[WA Ingestor] Starting. Session dir: ${sessionDir}`);
  console.log(`[WA Ingestor] Backend ingest URL: ${env.BACKEND_INGEST_URL}`);

  const { Client, LocalAuth } = WhatsAppWeb;
  const detectedChrome = detectChromeExecutable();
  const executablePath =
    env.WA_PUPPETEER_EXECUTABLE_PATH || detectedChrome || undefined;

  if (!executablePath) {
    console.warn(
      "[WA Ingestor] No Chrome/Chromium executable found. If Puppeteer skipped browser install, set WA_PUPPETEER_EXECUTABLE_PATH.",
    );
  } else if (!env.WA_PUPPETEER_EXECUTABLE_PATH && detectedChrome) {
    console.log(`[WA Ingestor] Using detected browser: ${detectedChrome}`);
  }

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionDir }),
    puppeteer: {
      headless: env.WA_HEADLESS,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath,
    },
  });

  let latestStatus: StatusPayload = {
    state: "starting",
    updatedAtMs: Date.now(),
  };

  const emitStatus = async (
    state: RuntimeState,
    options?: { qr?: string; info?: string },
  ) => {
    latestStatus = {
      state,
      qr: options?.qr,
      info: options?.info,
      updatedAtMs: Date.now(),
    };
    await postStatusToBackend(latestStatus);
  };

  client.on("qr", (qr) => {
    console.log("[WA Ingestor] Scan this QR to log in:");
    qrcode.generate(qr, { small: true });
    void emitStatus("qr_required", { qr, info: "Waiting for QR scan" });
  });

  client.on("authenticated", () => {
    console.log("[WA Ingestor] Authenticated.");
    void emitStatus("authenticated", { info: "Authenticated" });
  });

  client.on("auth_failure", (message) => {
    console.error("[WA Ingestor] Auth failure:", message);
    void emitStatus("auth_failure", { info: message });
  });

  client.on("ready", () => {
    console.log("[WA Ingestor] Ready. Listening for group text messages...");
    void emitStatus("ready", { info: "Listening for group text messages" });
  });

  client.on("disconnected", (reason) => {
    console.warn("[WA Ingestor] Disconnected:", reason);
    void emitStatus("disconnected", { info: String(reason) });
  });

  client.on("message", async (message) => {
    try {
      if (message.fromMe) return;
      if (!message.from.endsWith("@g.us")) return;
      if (message.type !== "chat") return;
      if (!message.body || message.body.length === 0) return;

      const sender = message.author || message.from;
      const timestampMs = (message.timestamp ?? Math.floor(Date.now() / 1000)) * 1000;
      const messageId = message.id?._serialized;

      let pushName: string | undefined;
      try {
        const contact = await message.getContact();
        pushName =
          contact.pushname || contact.name || contact.shortName || contact.number;
      } catch {
        pushName = undefined;
      }

      const payload = {
        groupId: message.from,
        sender,
        pushName,
        messageText: message.body,
        timestampMs,
        messageId,
      };

      const res = await postMessageToBackend(payload);
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        console.warn(
          `[WA Ingestor] Ingest failed (${res.status}) for ${message.from}: ${bodyText}`,
        );
        return;
      }
    } catch (error) {
      console.error("[WA Ingestor] Error handling message:", error);
    }
  });

  await emitStatus("starting", { info: "Initializing WhatsApp client" });
  await client.initialize();

  setInterval(() => {
    void postStatusToBackend({
      ...latestStatus,
      updatedAtMs: Date.now(),
    });
  }, env.WA_STATUS_HEARTBEAT_MS);

  let commandLoopBusy = false;
  setInterval(async () => {
    if (commandLoopBusy) return;
    commandLoopBusy = true;
    try {
      const commands = await getPendingCommands();
      for (const command of commands) {
        let ackResult: AckResult = { ok: true };
        try {
          if (command.command === "logout") {
            console.log("[WA Ingestor] Processing command: logout");
            try {
              await client.logout();
            } catch (logoutError) {
              console.warn(
                "[WA Ingestor] logout() failed, continue with reinitialize:",
                logoutError,
              );
              ackResult = { ok: false, error: String(logoutError) };
            }
            await emitStatus("starting", {
              info: "Logout command received. Reinitializing client.",
            });
            await client.initialize();
          } else if (command.command === "reconnect") {
            console.log("[WA Ingestor] Processing command: reconnect");
            try {
              await client.destroy();
            } catch (destroyError) {
              console.warn(
                "[WA Ingestor] destroy() failed, continue with reinitialize:",
                destroyError,
              );
              ackResult = { ok: false, error: String(destroyError) };
            }
            await emitStatus("starting", {
              info: "Reconnect command received. Reinitializing client.",
            });
            await client.initialize();
          } else if (command.command === "sync_groups") {
            console.log("[WA Ingestor] Processing command: sync_groups");
            try {
              const chats = await client.getChats();
              const groups = chats
                .filter((chat) => (chat as any)?.isGroup)
                .map((chat) => {
                  const id = (chat as any)?.id?._serialized as string | undefined;
                  const name = (chat as any)?.name as string | undefined;
                  return { id, name };
                })
                .filter(
                  (g): g is { id: string; name: string | undefined } =>
                    typeof g.id === "string" && g.id.endsWith("@g.us"),
                );

              const res = await postGroupsToBackend({
                groups,
                syncedAtMs: Date.now(),
              });
              if (!res.ok) {
                const bodyText = await res.text().catch(() => "");
                console.warn(
                  `[WA Ingestor] Group sync failed (${res.status}): ${bodyText}`,
                );
                ackResult = { ok: false, error: `Backend returned ${res.status}` };
              } else {
                console.log(
                  `[WA Ingestor] Group sync pushed: ${groups.length} groups`,
                );
              }
            } catch (syncError) {
              console.error("[WA Ingestor] sync_groups failed:", syncError);
              ackResult = { ok: false, error: String(syncError) };
            }
          } else if (command.command === "send_message") {
            const payload = command.payload!;
            console.log(`[WA Ingestor] Processing command: send_message to ${payload.groupId.slice(0, 20)}...`);

            // Only send if client is ready
            const state = await client.getState();
            if (state !== "CONNECTED") {
              const errorMsg = `Client not connected (state: ${state}). Cannot send message.`;
              console.warn(`[WA Ingestor] ${errorMsg}`);
              ackResult = { ok: false, error: errorMsg };
            } else {
              try {
                // Get the chat by ID and send the message
                const chat = await client.getChatById(payload.groupId);
                const result = await chat.sendMessage(payload.messageText);
                console.log(
                  `[WA Ingestor] Message sent to ${payload.groupId.slice(0, 20)}... (message ID: ${result.id?._serialized?.slice(0, 20) || "unknown"})`,
                );
                ackResult = { ok: true };
              } catch (sendError) {
                const errorMsg = `Failed to send message: ${String(sendError)}`;
                console.error(`[WA Ingestor] ${errorMsg}`);
                ackResult = { ok: false, error: errorMsg };
              }
            }
          }
        } catch (commandError) {
          console.error(
            `[WA Ingestor] Failed to execute command ${command.id}:`,
            commandError,
          );
          ackResult = { ok: false, error: String(commandError) };
        } finally {
          await ackCommand(command.id, ackResult);
        }
      }
    } catch (pollError) {
      console.error("[WA Ingestor] Command polling error:", pollError);
    } finally {
      commandLoopBusy = false;
    }
  }, env.WA_COMMAND_POLL_MS);
}

main().catch((error) => {
  console.error("[WA Ingestor] Fatal error:", error);
  process.exit(1);
});

