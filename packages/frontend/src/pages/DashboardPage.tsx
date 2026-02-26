import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { Dashboard } from "../components/dashboard";
import type { DashboardData } from "../components/dashboard";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard")
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, []);

  const handleNavigate = (path: string, filter?: string) => {
    navigate(filter ? `${path}?${filter}` : path);
  };

  const handlePersonClick = (personId: string) => {
    navigate(`/people/${personId}`);
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">Failed to load dashboard</p>
          <p className="text-xs text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <Dashboard
      kpis={data.kpis}
      goalAlignment={data.goalAlignment}
      attentionPeople={data.attentionPeople}
      activityFeed={data.activityFeed}
      onNavigate={handleNavigate}
      onPersonClick={handlePersonClick}
    />
  );
}
