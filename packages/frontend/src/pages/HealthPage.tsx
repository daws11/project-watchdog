import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

type HealthResponse = {
  status: "healthy" | "degraded";
  timestamp: string;
  uptime: number;
  database: "connected" | "disconnected";
  message: string;
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
              <span className="font-semibold">Database:</span> {health.database}
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
