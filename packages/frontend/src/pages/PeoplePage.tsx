import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { PeopleList } from "../components/people";
import type { PersonSummary, Task, TaskMessage } from "../components/people/types";

interface PeopleData {
  people: PersonSummary[];
  tasks: Task[];
  messages: TaskMessage[];
}

export default function PeoplePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PeopleData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PeopleData>("/api/people")
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">Failed to load people</p>
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
    <PeopleList
      people={data.people}
      onPersonClick={(personId) => navigate(`/people/${personId}`)}
    />
  );
}
