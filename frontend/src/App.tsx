import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Alert, Box, Container } from "@mui/material";
import AppHeader from "./components/AppHeader";
import { getConfigsRequest } from "./features/configs/api/config.client";
import ConfigsPage from "./features/configs/ConfigsPage";
import { loadSelectedConfigId, saveSelectedConfigId } from "./features/configs/storage";
import type { AppConfig } from "./features/configs/types";
import JourneyPage from "./features/journey/JourneyPage";

const DJ_NAME_STORAGE_KEY = "combats-dj:dj-name";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Config request failed";
}

export default function App() {
  const [djName, setDjName] = useState(() => localStorage.getItem(DJ_NAME_STORAGE_KEY) ?? "");
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState(() => loadSelectedConfigId() ?? "");
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configsError, setConfigsError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(DJ_NAME_STORAGE_KEY, djName);
  }, [djName]);

  const loadConfigs = useCallback(async () => {
    setConfigsLoading(true);
    setConfigsError(null);

    try {
      const nextConfigs = await getConfigsRequest();
      setConfigs(nextConfigs);

      const storedConfigId = loadSelectedConfigId();
      const fallbackConfigId = nextConfigs[0]?.id ?? "";
      const resolvedConfigId =
        (storedConfigId && nextConfigs.some((config) => config.id === storedConfigId) && storedConfigId) || fallbackConfigId;

      setSelectedConfigId(resolvedConfigId);

      if (resolvedConfigId) {
        saveSelectedConfigId(resolvedConfigId);
      }
    } catch (error) {
      setConfigsError(getErrorMessage(error));
    } finally {
      setConfigsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const handleSelectedConfigChange = useCallback((nextConfigId: string) => {
    setSelectedConfigId(nextConfigId);
    saveSelectedConfigId(nextConfigId);
  }, []);

  const selectedConfig = useMemo(
    () => configs.find((config) => config.id === selectedConfigId) ?? configs[0] ?? null,
    [configs, selectedConfigId],
  );

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
        onSelectedConfigChange={handleSelectedConfigChange}
      />
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3.5 } }}>
        {configsError && !configs.length ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {configsError}
          </Alert>
        ) : null}

        <Routes>
          <Route path="/" element={<Navigate to="/journey" replace />} />
          <Route path="/journey" element={<JourneyPage djName={djName} selectedConfig={selectedConfig} />} />
          <Route
            path="/config"
            element={
              <ConfigsPage
                configs={configs}
                selectedConfigId={selectedConfig?.id ?? ""}
                onSelectConfig={handleSelectedConfigChange}
                isLoading={configsLoading}
                error={configsError}
              />
            }
          />
        </Routes>
      </Container>
    </Box>
  );
}
