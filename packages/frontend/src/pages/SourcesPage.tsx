import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { SourcesView } from "../components/sources";
import type {
  Channel,
  Connection,
  EditConnectionData,
  NewConnectionData,
  ProjectOption,
} from "../components/sources";

interface SourcesData {
  channels: Channel[];
  connections: Connection[];
}

interface ProjectsData {
  projects: Array<{
    id: number;
    name: string;
  }>;
}

export default function SourcesPage() {
  const [data, setData] = useState<SourcesData | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    return apiFetch<SourcesData>("/api/sources")
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, []);

  const fetchProjects = useCallback(() => {
    apiFetch<ProjectsData>("/api/projects")
      .then((data) => setProjects(data.projects))
      .catch((err) => console.error("Failed to fetch projects:", err));
  }, []);

  useEffect(() => {
    refresh();
    fetchProjects();
  }, [refresh, fetchProjects]);

  const mutate = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refresh();
    } catch (err) {
      console.error("Sources mutation failed:", err);
      setError((err as Error).message);
    }
  };

  const syncChannel = (channelId: string) => {
    if (channelId !== "whatsapp") return;
    void (async () => {
      try {
        setError(null);
        await apiFetch(`/api/sources/whatsapp/sync`, {
          method: "POST",
        });

        // Best-effort refresh: the WA ingestor will push group list asynchronously.
        window.setTimeout(() => void refresh(), 1500);
        window.setTimeout(() => void refresh(), 4000);
      } catch (err) {
        console.error("Sources sync failed:", err);
        setError((err as Error).message);
      }
    })();
  };

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">Failed to load sources</p>
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
    <SourcesView
      channels={data.channels}
      connections={data.connections}
      projects={projects}
      onSyncChannel={syncChannel}
      onAddConnection={(channelId: string, payload: NewConnectionData) =>
        mutate(() =>
          apiFetch(`/api/sources/${channelId}/connections`, {
            method: "POST",
            body: JSON.stringify(payload),
          }),
        )
      }
      onPauseConnection={(connectionId: string) =>
        mutate(() =>
          apiFetch(`/api/sources/connections/${connectionId}/pause`, {
            method: "POST",
          }),
        )
      }
      onResumeConnection={(connectionId: string) =>
        mutate(() =>
          apiFetch(`/api/sources/connections/${connectionId}/resume`, {
            method: "POST",
          }),
        )
      }
      onEditConnection={(connectionId: string, payload: EditConnectionData) =>
        mutate(() =>
          apiFetch(`/api/sources/connections/${connectionId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          }),
        )
      }
      onDeleteConnection={(connectionId: string) =>
        mutate(() =>
          apiFetch(`/api/sources/connections/${connectionId}`, {
            method: "DELETE",
          }),
        )
      }
      onRetryConnection={(connectionId: string) =>
        mutate(() =>
          apiFetch(`/api/sources/connections/${connectionId}/retry`, {
            method: "POST",
          }),
        )
      }
    />
  );
}

