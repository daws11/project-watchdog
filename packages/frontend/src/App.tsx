import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  AppShell,
  defaultBottomItems,
  defaultNavigationItems,
  type NavigationItem,
} from "./components/shell";
import DashboardPage from "./pages/DashboardPage";
import HealthPage from "./pages/HealthPage";
import TasksPage from "./pages/TasksPage";
import PeoplePage from "./pages/PeoplePage";
import PersonDetailPage from "./pages/PersonDetailPage";
import SourcesPage from "./pages/SourcesPage";
import ProcessingPage from "./pages/ProcessingPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import { apiFetch } from "./api/client";

function hasToken(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("auth_token"));
}

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "regular";
  sectionPermissions: string[];
  assignedPeopleIds: string[];
};

const SECTION_BY_PATH: Record<string, string> = {
  "/dashboard": "dashboard",
  "/people": "people",
  "/tasks": "tasks",
  "/sources": "sources",
  "/processing": "processing",
  "/settings": "settings",
  "/health": "health",
};

const NAV_ORDER = [
  "/dashboard",
  "/people",
  "/tasks",
  "/sources",
  "/processing",
  "/settings",
  "/health",
];

export default function App() {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const token = hasToken();
    if (!token) {
      setCurrentUser(null);
      setAuthLoading(false);
      return;
    }

    apiFetch<CurrentUser>("/api/auth/me")
      .then((user) => setCurrentUser(user))
      .catch(() => {
        window.localStorage.removeItem("auth_token");
        setCurrentUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const canAccess = (section: string) => {
    if (!currentUser) return false;
    if (section === "health") return true;
    if (currentUser.role === "admin") return true;
    return currentUser.sectionPermissions.includes(section);
  };

  const fallbackPath = useMemo(() => {
    if (!currentUser) return "/login";
    const firstAllowed = NAV_ORDER.find((path) => canAccess(SECTION_BY_PATH[path]));
    return firstAllowed ?? "/health";
  }, [currentUser]);

  const navigationItems = useMemo(() => {
    const nav = defaultNavigationItems.filter((item) => {
      const section = SECTION_BY_PATH[item.href];
      return section ? canAccess(section) : false;
    });
    return nav as NavigationItem[];
  }, [currentUser]);

  const bottomItems = useMemo(() => {
    if (!currentUser) return [];
    return defaultBottomItems.filter((item) => {
      const section = SECTION_BY_PATH[item.href];
      return section ? canAccess(section) : false;
    });
  }, [currentUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">
        Loading session...
      </div>
    );
  }

  const authenticated = Boolean(currentUser);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLoginSuccess={setCurrentUser} />} />
      <Route
        path="*"
        element={
          authenticated ? (
            <AppShell
              navigationItems={navigationItems}
              bottomItems={bottomItems}
              user={{
                name: currentUser?.name ?? "User",
                email: currentUser?.email,
              }}
              onLogout={() => {
                window.localStorage.removeItem("auth_token");
                setCurrentUser(null);
                navigate("/login", { replace: true });
              }}
              onNavigate={(href) => navigate(href)}
            >
              <Routes>
                <Route path="/" element={<Navigate to={fallbackPath} replace />} />
                <Route
                  path="/dashboard"
                  element={canAccess("dashboard") ? <DashboardPage /> : <Navigate to={fallbackPath} replace />}
                />
                <Route
                  path="/people"
                  element={canAccess("people") ? <PeoplePage /> : <Navigate to={fallbackPath} replace />}
                />
                <Route
                  path="/people/:id"
                  element={canAccess("people") ? <PersonDetailPage /> : <Navigate to={fallbackPath} replace />}
                />
                <Route
                  path="/tasks"
                  element={canAccess("tasks") ? <TasksPage /> : <Navigate to={fallbackPath} replace />}
                />
                <Route
                  path="/sources"
                  element={canAccess("sources") ? <SourcesPage /> : <Navigate to={fallbackPath} replace />}
                />
                <Route
                  path="/processing"
                  element={canAccess("processing") ? <ProcessingPage /> : <Navigate to={fallbackPath} replace />}
                />
                <Route
                  path="/settings"
                  element={canAccess("settings") ? <SettingsPage /> : <Navigate to={fallbackPath} replace />}
                />
                <Route path="/health" element={<HealthPage />} />
              </Routes>
            </AppShell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
