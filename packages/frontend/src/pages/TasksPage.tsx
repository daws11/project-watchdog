import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { TasksView, ProjectTasksView } from "../components/tasks";
import type {
  Task,
  PersonSummary,
  SourceSummary,
  TaskMessage,
  ChatMessage,
  PersonSettingsData,
  ProjectWithTasks,
  ViewMode,
} from "../components/tasks/types";

interface TasksData {
  tasks: Task[];
  people: PersonSummary[];
  sources: SourceSummary[];
  messages: TaskMessage[];
  chatMessages: ChatMessage[];
}

interface ProjectsData {
  projects: ProjectWithTasks[];
  messages: TaskMessage[];
  chatMessages: ChatMessage[];
}

export default function TasksPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('priority');
  const [priorityData, setPriorityData] = useState<TasksData | null>(null);
  const [projectData, setProjectData] = useState<ProjectsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Fetch data based on view mode
  const fetchData = useCallback(async () => {
    try {
      if (viewMode === 'priority') {
        if (!priorityData) {
          const data = await apiFetch<TasksData>("/api/tasks");
          setPriorityData(data);
          setChatMessages(data.chatMessages);
        }
      } else {
        if (!projectData) {
          const data = await apiFetch<ProjectsData>("/api/tasks/by-project");
          setProjectData(data);
          setChatMessages(data.chatMessages);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [viewMode, priorityData, projectData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `chat-${Date.now()}-resp`,
        role: "assistant",
        content: `Based on the ${taskContext.length} tasks in view, here's what I found:\n\n${message.toLowerCase().includes("overdue") ? `There are ${taskContext.filter((t) => t.isOverdue).length} overdue tasks that need immediate attention.` : `I see ${taskContext.filter((t) => t.priority === "high").length} high-priority tasks among the ${taskContext.length} filtered tasks.`}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
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

  // Show loading if no data for current view mode
  const isLoading = viewMode === 'priority' ? !priorityData : !projectData;

  return (
    <div className="h-full flex flex-col">
      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      ) : viewMode === 'priority' && priorityData ? (
        <TasksView
          tasks={priorityData.tasks}
          people={priorityData.people}
          sources={priorityData.sources}
          messages={priorityData.messages}
          chatMessages={chatMessages}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onPersonClick={(personId) => navigate(`/people/${personId}`)}
          onSavePersonSettings={handleSavePersonSettings}
          onChatSend={handleChatSend}
        />
      ) : projectData ? (
        <ProjectTasksView
          projects={projectData.projects}
          messages={projectData.messages}
          chatMessages={chatMessages}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onPersonClick={(personId) => navigate(`/people/${personId}`)}
          onChatSend={handleChatSend}
        />
      ) : null}
    </div>
  );
}
