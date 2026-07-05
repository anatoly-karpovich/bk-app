import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Alert, Box, Container } from "@mui/material";
import AppHeader from "./components/AppHeader";
import BattleshipsPage from "./features/battleships/BattleshipsPage";
import ConfigsPage from "./features/configs/ConfigsPage";
import { useConfigs } from "./features/configs/hooks/useConfigs";
import JourneyPage from "./features/journey/JourneyPage";
import LottoPage from "./features/lotto/LottoPage";

const DJ_NAME_STORAGE_KEY = "combats-dj:dj-name";

export default function App() {
  const [djName, setDjName] = useState(() => localStorage.getItem(DJ_NAME_STORAGE_KEY) ?? "");
  const { configs, selectedConfig, isLoading, error, actions } = useConfigs();

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
        configs={configs}
        selectedConfigId={selectedConfig?.id ?? ""}
        onSelectedConfigChange={actions.selectConfig}
      />
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3.5 } }}>
        {error && !configs.length ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : null}

        <Routes>
          <Route path="/" element={<Navigate to="/journey" replace />} />
          <Route path="/journey" element={<JourneyPage djName={djName} selectedConfig={selectedConfig} />} />
          <Route path="/lotto" element={<LottoPage djName={djName} selectedConfig={selectedConfig} />} />
          <Route path="/battleship" element={<BattleshipsPage djName={djName} selectedConfig={selectedConfig} />} />
          <Route
            path="/config"
            element={
              <ConfigsPage
                configs={configs}
                selectedConfigId={selectedConfig?.id ?? ""}
                onSelectConfig={actions.selectConfig}
                isLoading={isLoading}
                error={error}
              />
            }
          />
        </Routes>
      </Container>
    </Box>
  );
}
