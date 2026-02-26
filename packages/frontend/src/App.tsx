import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AppShell } from "./components/shell";
import DashboardPage from "./pages/DashboardPage";
import HealthPage from "./pages/HealthPage";
import TasksPage from "./pages/TasksPage";
import PeoplePage from "./pages/PeoplePage";
import PersonDetailPage from "./pages/PersonDetailPage";
import SourcesPage from "./pages/SourcesPage";
import ProcessingPage from "./pages/ProcessingPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const navigate = useNavigate();

  return (
    <AppShell onNavigate={(href) => navigate(href)}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/people/:id" element={<PersonDetailPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/processing" element={<ProcessingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/health" element={<HealthPage />} />
      </Routes>
    </AppShell>
  );
}
