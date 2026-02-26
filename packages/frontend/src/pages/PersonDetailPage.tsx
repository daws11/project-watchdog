import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { PersonDetail } from "../components/people";
import type {
  PersonSummary,
  Task,
  TaskMessage,
  PersonSettingsData,
} from "../components/people/types";

interface PersonData {
  person: PersonSummary;
  tasks: Task[];
  messages: TaskMessage[];
  averageTaskCount: number;
}

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PersonData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<PersonData>(`/api/people/${id}`)
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, [id]);

  const handleSaveSettings = (personId: string, settings: PersonSettingsData) => {
    apiFetch(`/api/people/${personId}/settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }).catch((err) => console.error("Failed to save settings:", err));
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">Failed to load person</p>
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
    <PersonDetail
      person={data.person}
      tasks={data.tasks}
      messages={data.messages}
      averageTaskCount={data.averageTaskCount}
      onBack={() => navigate("/people")}
      onSaveSettings={handleSaveSettings}
      onPersonReferenceClick={(personId) => navigate(`/people/${personId}`)}
    />
  );
}
