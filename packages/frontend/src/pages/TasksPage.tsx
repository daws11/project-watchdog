import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { TasksView } from "../components/tasks";
import type {
  Task,
  PersonSummary,
  SourceSummary,
  TaskMessage,
  ChatMessage,
  PersonSettingsData,
} from "../components/tasks/types";

interface TasksData {
  tasks: Task[];
  people: PersonSummary[];
  sources: SourceSummary[];
  messages: TaskMessage[];
  chatMessages: ChatMessage[];
}

export default function TasksPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TasksData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TasksData>("/api/tasks")
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, []);

  const handleSavePersonSettings = (
    personId: string,
    settings: PersonSettingsData,
  ) => {
    apiFetch(`/api/people/${personId}/settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }).catch((err) => console.error("Failed to save settings:", err));
  };

  const handleChatSend = (message: string, taskContext: Task[]) => {
    if (!data) return;
    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    setData((prev) =>
      prev ? { ...prev, chatMessages: [...prev.chatMessages, userMsg] } : prev,
    );

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `chat-${Date.now()}-resp`,
        role: "assistant",
        content: `Based on the ${taskContext.length} tasks in view, here's what I found:\n\n${message.toLowerCase().includes("overdue") ? `There are ${taskContext.filter((t) => t.isOverdue).length} overdue tasks that need immediate attention.` : `I see ${taskContext.filter((t) => t.priority === "high").length} high-priority tasks among the ${taskContext.length} filtered tasks.`}`,
        timestamp: new Date().toISOString(),
      };
      setData((prev) =>
        prev
          ? { ...prev, chatMessages: [...prev.chatMessages, assistantMsg] }
          : prev,
      );
    }, 800);
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">Failed to load tasks</p>
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
    <TasksView
      tasks={data.tasks}
      people={data.people}
      sources={data.sources}
      messages={data.messages}
      chatMessages={data.chatMessages}
      onPersonClick={(personId) => navigate(`/people/${personId}`)}
      onSavePersonSettings={handleSavePersonSettings}
      onChatSend={handleChatSend}
    />
  );
}
