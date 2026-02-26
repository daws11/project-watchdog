import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { dashboardRouter } from "./routes/dashboard";
import { healthRouter } from "./routes/health";
import { peopleRouter } from "./routes/people";
import { processingRouter } from "./routes/processing";
import { settingsRouter } from "./routes/settings";
import { sourcesRouter } from "./routes/sources";
import { tasksRouter } from "./routes/tasks";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/dashboard", dashboardRouter);
app.use("/api/health", healthRouter);
app.use("/api/people", peopleRouter);
app.use("/api/processing", processingRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/tasks", tasksRouter);

app.get("/", (_req, res) => {
  res.json({ message: "Project Watchdog API" });
});

app.listen(env.PORT, () => {
  console.log(`backend listening on http://localhost:${env.PORT}`);
});
