import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Alert, Box, Container } from "@mui/material";
import AppHeader from "./components/AppHeader";
import BattleshipsPage from "./features/battleships/BattleshipsPage";
import GameConfigsPage from "./features/configs/GameConfigsPage";
import JourneyConfigPage from "./features/configs/JourneyConfigPage";
import LottoConfigPage from "./features/configs/LottoConfigPage";
import JourneyPage from "./features/journey/JourneyPage";
import LottoPage from "./features/lotto/LottoPage";
import ProjectPage from "./features/projects/ProjectPage";
import { useProjects } from "./features/projects/hooks/useProjects";

const DJ_NAME_STORAGE_KEY = "combats-dj:dj-name";

export default function App() {
  const [djName, setDjName] = useState(() => localStorage.getItem(DJ_NAME_STORAGE_KEY) ?? "");
  const { projects, selectedProject, error, isSaving, actions } = useProjects();

  useEffect(() => {
    localStorage.setItem(DJ_NAME_STORAGE_KEY, djName);
  }, [djName]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(79, 70, 229, 0.14), transparent 320px), linear-gradient(180deg, #f8fbff 0%, #eef2f6 260px)",
      }}
    >
      <AppHeader
        djName={djName}
        onDjNameChange={setDjName}
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
          <Route path="/" element={<Navigate to="/journey" replace />} />
          <Route path="/journey" element={<JourneyPage djName={djName} selectedProject={selectedProject} />} />
          <Route path="/lotto" element={<LottoPage djName={djName} selectedProject={selectedProject} />} />
          <Route path="/battleship" element={<BattleshipsPage djName={djName} selectedProject={selectedProject} />} />
          <Route path="/project" element={<ProjectPage selectedProject={selectedProject} error={error} isSaving={isSaving} onUpdateProject={actions.updateProject} />} />
          <Route path="/configs" element={<GameConfigsPage selectedProject={selectedProject} />} />
          <Route path="/configs/journey/:configId" element={<JourneyConfigPage selectedProject={selectedProject} />} />
          <Route path="/configs/lotto/:configId" element={<LottoConfigPage selectedProject={selectedProject} />} />
          <Route path="/config" element={<Navigate to="/configs" replace />} />
        </Routes>
      </Container>
    </Box>
  );
}
