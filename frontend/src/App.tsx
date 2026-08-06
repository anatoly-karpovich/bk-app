import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Alert, Box, Container } from "@mui/material";
import AppHeader from "./components/AppHeader";
import BattleshipsPage from "./features/battleships/BattleshipsPage";
import BattleshipsConfigPage from "./features/configs/BattleshipsConfigPage";
import GameConfigsPage from "./features/configs/GameConfigsPage";
import QuizConfigsPage from "./features/configs/QuizConfigsPage";
import QuizConfigPage from "./features/configs/QuizConfigPage";
import QuizConfigCreatePage from "./features/configs/QuizConfigCreatePage";
import JourneyConfigPage from "./features/configs/JourneyConfigPage";
import LottoConfigPage from "./features/configs/LottoConfigPage";
import JourneyPage from "./features/journey/JourneyPage";
import LottoPage from "./features/lotto/LottoPage";
import ProjectPage from "./features/projects/ProjectPage";
import { useProjects } from "./features/projects/hooks/useProjects";
import LoginPage from "./features/auth/LoginPage";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { useAuth } from "./features/auth/useAuth";
import { AdminRoute } from "./features/auth/AdminRoute";
import UsersPage from "./features/users/UsersPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import QuizzesPage from "./features/utilities/quizzes/QuizzesPage";
import QuizCreatePage from "./features/utilities/quizzes/QuizCreatePage";
import QuizEditorPage from "./features/utilities/quizzes/QuizEditorPage";
import QuizEventsPage from "./features/utilities/quizzes/QuizEventsPage";
import QuizEventPage from "./features/utilities/quizzes/QuizEventPage";

export default function App() {
  return <Routes><Route path="/login" element={<LoginPage />} /><Route path="/*" element={<ProtectedRoute><AuthenticatedApp /></ProtectedRoute>} /></Routes>;
}

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { projects, selectedProject, error, isSaving, actions } = useProjects();
  const djName = selectedProject ? user?.projectProfiles.find((profile) => profile.projectId === selectedProject.id)?.nickname ?? "" : "";

  useEffect(() => {
    const redirectToDashboard = () => navigate("/", { replace: true });
    window.addEventListener("bk:access-forbidden", redirectToDashboard);
    return () => window.removeEventListener("bk:access-forbidden", redirectToDashboard);
  }, [navigate]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(79, 70, 229, 0.14), transparent 320px), linear-gradient(180deg, #f8fbff 0%, #eef2f6 260px)",
      }}
    >
      <AppHeader
        user={user!}
        onLogout={() => logout()}
        projects={projects}
        selectedProjectId={selectedProject?.id ?? ""}
        onSelectedProjectChange={actions.selectProject}
      />
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3.5 } }}>
        {error && !projects.length ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : null}

        <Routes>
          <Route path="/" element={<DashboardPage user={user!} />} />
          <Route path="/journey" element={<JourneyPage djName={djName} selectedProject={selectedProject} />} />
          <Route path="/lotto" element={<LottoPage djName={djName} selectedProject={selectedProject} />} />
          <Route path="/battleship" element={<BattleshipsPage djName={djName} selectedProject={selectedProject} />} />
          <Route path="/quizzes" element={<QuizzesPage selectedProject={selectedProject} />} />
          <Route path="/quizzes/create" element={<QuizCreatePage selectedProject={selectedProject} />} />
          <Route path="/quizzes/events" element={<QuizEventsPage selectedProject={selectedProject} />} />
          <Route path="/quizzes/events/:eventId" element={<QuizEventPage selectedProject={selectedProject} />} />
          <Route path="/quizzes/:quizId/edit" element={<QuizEditorPage selectedProject={selectedProject} />} />
          <Route path="/project" element={<ProjectPage selectedProject={selectedProject} canEdit={user?.role === "admin"} error={error} isSaving={isSaving} onUpdateProject={actions.updateProject} />} />
          <Route path="/configs" element={<GameConfigsPage selectedProject={selectedProject} />} />
          <Route path="/configs/quizzes" element={<QuizConfigsPage selectedProject={selectedProject} />} />
          <Route path="/configs/quizzes/create" element={<QuizConfigCreatePage selectedProject={selectedProject} />} />
          <Route path="/configs/quizzes/:configId" element={<QuizConfigPage selectedProject={selectedProject} />} />
          <Route path="/configs/journey/:configId" element={<JourneyConfigPage selectedProject={selectedProject} />} />
          <Route path="/configs/lotto/:configId" element={<LottoConfigPage selectedProject={selectedProject} />} />
          <Route path="/configs/battleships/:configId" element={<BattleshipsConfigPage selectedProject={selectedProject} />} />
          <Route path="/users" element={<AdminRoute><UsersPage projects={projects} /></AdminRoute>} />
          <Route path="/config" element={<Navigate to="/configs" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </Box>
  );
}
