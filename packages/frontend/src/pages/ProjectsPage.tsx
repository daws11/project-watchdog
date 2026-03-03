import { useEffect, useState, useCallback } from "react";
import { FolderKanban, Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronRight } from "lucide-react";
import { apiFetch } from "../api/client";

interface Project {
  id: number;
  name: string;
  description: string | null;
  healthScore: number;
  taskStats: {
    open: number;
    done: number;
    blocked: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProjectTask {
  id: string;
  title: string;
  assignee: string | null;
  status: string;
  deadline: string | null;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

interface ProjectsData {
  projects: Project[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Task dropdown (expanded project + cached tasks)
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [projectTasksMap, setProjectTasksMap] = useState<Record<number, ProjectTask[]>>({});
  const [loadingTaskIds, setLoadingTaskIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjectTasks = useCallback(async (projectId: number) => {
    if (projectTasksMap[projectId]) return;
    setLoadingTaskIds((prev) => new Set(prev).add(projectId));
    try {
      const data = await apiFetch<{ project: Project; tasks: ProjectTask[] }>(
        `/api/projects/${projectId}`
      );
      setProjectTasksMap((prev) => ({ ...prev, [projectId]: data.tasks }));
    } catch (err) {
      console.error("Failed to fetch project tasks:", err);
    } finally {
      setLoadingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }, [projectTasksMap]);

  const toggleTaskDropdown = (project: Project) => {
    if (expandedProjectId === project.id) {
      setExpandedProjectId(null);
    } else {
      setExpandedProjectId(project.id);
      fetchProjectTasks(project.id);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<ProjectsData>("/api/projects");
      setProjects(data.projects);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;

    try {
      const response = await apiFetch<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
        }),
      });
      setProjects([...projects, response.project]);
      setNewName("");
      setNewDescription("");
      setIsCreating(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;

    try {
      const response = await apiFetch<{ project: Project }>(`/api/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      });
      setProjects(
        projects.map((p) => (p.id === id ? response.project : p))
      );
      setEditingId(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/projects/${id}`, {
        method: "DELETE",
      });
      setProjects(projects.filter((p) => p.id !== id));
      setDeletingId(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startEdit = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDescription(project.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const getHealthColor = (score: number): string => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getHealthBg = (score: number): string => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Projects
              </h1>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                Manage your projects and their AI context
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              <Plus className="size-4" strokeWidth={1.5} />
              New Project
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Create Form */}
          {isCreating && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Create New Project
                </h2>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter project name..."
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe this project (helps AI classify messages)..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-md text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="size-3.5" strokeWidth={1.5} />
                    Create
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="size-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No projects yet. Create your first project to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  {editingId === project.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Project description..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdate(project.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                          <Check className="size-3" strokeWidth={1.5} />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <FolderKanban className="size-5 text-sky-500 shrink-0" strokeWidth={1.5} />
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {project.name}
                            </h3>
                          </div>
                          {project.description && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4 shrink-0">
                          <button
                            onClick={() => startEdit(project)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                          >
                            <Pencil className="size-4" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => setDeletingId(project.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                          >
                            <Trash2 className="size-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        {/* Task counts */}
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-zinc-500">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{project.taskStats.total}</span> tasks
                          </span>
                          <span className="text-zinc-300">|</span>
                          <span className="text-zinc-500">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{project.taskStats.open}</span> open
                          </span>
                          <span className="text-zinc-300">|</span>
                          <span className="text-zinc-500">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">{project.taskStats.done}</span> done
                          </span>
                          {project.taskStats.blocked > 0 && (
                            <>
                              <span className="text-zinc-300">|</span>
                              <span className="text-zinc-500">
                                <span className="font-medium text-orange-600 dark:text-orange-400">{project.taskStats.blocked}</span> blocked
                              </span>
                            </>
                          )}
                        </div>

                        {/* Health score */}
                        <div className="flex items-center gap-2 ml-auto">
                          <span className={`text-xs font-medium ${getHealthColor(project.healthScore)}`}>
                            Health {project.healthScore}%
                          </span>
                          <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getHealthBg(project.healthScore)}`}
                              style={{ width: `${project.healthScore}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Task dropdown */}
                      {project.taskStats.total > 0 && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleTaskDropdown(project)}
                            className="w-full flex items-center justify-between px-3 py-2 text-left text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              {expandedProjectId === project.id ? (
                                <ChevronDown className="size-4" strokeWidth={1.5} />
                              ) : (
                                <ChevronRight className="size-4" strokeWidth={1.5} />
                              )}
                              {project.taskStats.total} task{project.taskStats.total !== 1 ? "s" : ""}
                            </span>
                          </button>
                          {expandedProjectId === project.id && (
                            <div className="mt-1 border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/50">
                              {loadingTaskIds.has(project.id) ? (
                                <div className="px-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                                  Loading tasks...
                                </div>
                              ) : (projectTasksMap[project.id]?.length ?? 0) === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                                  No tasks
                                </div>
                              ) : (
                                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                                  {projectTasksMap[project.id]?.map((task) => (
                                    <li
                                      key={task.id}
                                      className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30"
                                    >
                                      <span className="text-sm text-zinc-900 dark:text-zinc-100 truncate flex-1 min-w-0">
                                        {task.title}
                                      </span>
                                      <div className="flex items-center gap-2 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                                        {task.assignee && (
                                          <span className="truncate max-w-[100px]">{task.assignee}</span>
                                        )}
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                            task.status === "done"
                                              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                                              : task.status === "blocked"
                                              ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400"
                                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                          }`}
                                        >
                                          {task.status}
                                        </span>
                                        {task.deadline && (
                                          <span>
                                            {new Date(task.deadline).toLocaleDateString("en-GB", {
                                              day: "numeric",
                                              month: "short",
                                            })}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Delete Confirmation */}
                  {deletingId === project.id && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                        Are you sure? This will permanently delete the project and all its tasks.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
