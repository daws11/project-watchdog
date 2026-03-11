import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { initializeQueue } from "./queue";
import { registerMessageProcessor } from "./workers/message-processor";
import { registerProcessingRunner } from "./workers/processing-runner";
import { registerTaskExtractor } from "./workers/task-extractor";
import { registerRiskEngine } from "./workers/risk-engine";
import { registerReportGenerator } from "./workers/report-generator";
import { authenticate, authorizeSection, requireAdmin } from "./middleware/auth";
import { validateIngestToken } from "./middleware/webhook-auth";
import { requestLogger } from "./middleware/request-logger";
import { authRouter } from "./routes/auth";
import { dashboardRouter } from "./routes/dashboard";
import { healthRouter } from "./routes/health";
import { peopleRouter } from "./routes/people";
import { processingRouter } from "./routes/processing";
import { projectsRouter } from "./routes/projects";
import { reportsRouter } from "./routes/reports";
import { settingsRouter } from "./routes/settings";
import { sourcesRouter } from "./routes/sources";
import { tasksRouter } from "./routes/tasks";
import { whatsappWebIngestRouter } from "./ingest/whatsapp-web";

const app = express();

app.use(cors());
app.use(express.json());

// Public routes (no auth required)
app.use("/api/auth", authRouter);
app.use("/api/health", healthRouter);

// WhatsApp Web ingestion routes (shared secret header auth)
// This handles both inbound messages and outbound send command polling
app.use("/ingest/whatsapp-web", validateIngestToken, whatsappWebIngestRouter);

// Request logging (after auth, so we can log user)
app.use(requestLogger);

// Protected routes (JWT auth required)
app.use("/api/dashboard", authenticate, authorizeSection("dashboard"), dashboardRouter);
app.use("/api/people", authenticate, authorizeSection("people"), peopleRouter);
app.use("/api/tasks", authenticate, authorizeSection("tasks"), tasksRouter);
app.use("/api/projects", authenticate, authorizeSection("tasks"), projectsRouter);
app.use("/api/sources", authenticate, authorizeSection("sources"), sourcesRouter);
app.use("/api/processing", authenticate, authorizeSection("processing"), processingRouter);
app.use("/api/reports", authenticate, authorizeSection("reports"), reportsRouter);

// Admin-only routes
app.use("/api/settings", authenticate, requireAdmin, settingsRouter);

// Development-only test routes
if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
  console.log("[Server] Registering development test routes");
  const { default: testPromptRouter } = await import("./routes/test-prompt");
  app.use("/api/test", testPromptRouter);
}

app.get("/", (_req, res) => {
  res.json({ message: "Project Watchdog API" });
});

async function startServer() {
  try {
    // Initialize pg-boss queue
    await initializeQueue();
    console.log("[Server] Queue initialized");

    // Register workers
    await registerMessageProcessor();
    await registerProcessingRunner();
    await registerTaskExtractor();
    await registerRiskEngine();
    await registerReportGenerator();
    console.log("[Server] Workers registered");

    // Start Express server
    app.listen(env.PORT, () => {
      console.log(`[Server] Backend listening on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
}

startServer();
