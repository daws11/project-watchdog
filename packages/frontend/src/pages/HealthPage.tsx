import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

type HealthResponse = {
  status: "healthy" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  message: string;
  healthCheckDuration?: number;
  database: {
    status: "connected" | "disconnected";
    latency: number;
  };
  queue: {
    depth: number;
    failedJobs: number;
  };
  webhook: {
    lastReceivedAt: string | null;
    messagesProcessed: number;
  };
  ai: {
    lastJobStatus: "success" | "error" | "running" | null;
    lastJobCompletedAt: string | null;
  };
};

export default function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<HealthResponse>("/api/health")
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="page-shell space-y-4">
      <h1 className="text-2xl font-bold">System Health</h1>
      <div className="card">
        {!health && !error && <p>Loading health status...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {health && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Status:</span> {health.status}
            </p>
            <p>
              <span className="font-semibold">Database:</span> {health.database.status}
            </p>
            <p>
              <span className="font-semibold">DB Latency:</span> {health.database.latency}ms
            </p>
            <p>
              <span className="font-semibold">Queue Depth:</span> {health.queue.depth}
            </p>
            <p>
              <span className="font-semibold">Queue Failed Jobs:</span> {health.queue.failedJobs}
            </p>
            <p>
              <span className="font-semibold">Last Webhook:</span>{" "}
              {health.webhook.lastReceivedAt
                ? new Date(health.webhook.lastReceivedAt).toLocaleString()
                : "Never"}
            </p>
            <p>
              <span className="font-semibold">Messages Processed:</span>{" "}
              {health.webhook.messagesProcessed}
            </p>
            <p>
              <span className="font-semibold">Last AI Job:</span>{" "}
              {health.ai.lastJobStatus ?? "No runs"}
            </p>
            <p>
              <span className="font-semibold">Last AI Completion:</span>{" "}
              {health.ai.lastJobCompletedAt
                ? new Date(health.ai.lastJobCompletedAt).toLocaleString()
                : "N/A"}
            </p>
            <p>
              <span className="font-semibold">Uptime:</span>{" "}
              {Math.floor(health.uptime)}s
            </p>
            <p>
              <span className="font-semibold">Message:</span> {health.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
