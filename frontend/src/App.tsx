import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, Container } from "@mui/material";
import AppHeader from "./components/AppHeader";
import JourneyPage from "./features/journey/JourneyPage";
import JourneyRulesetsPage from "./features/journey/JourneyRulesetsPage";
import type { JourneyRulesetState } from "./features/journey/types";
import {
  loadDefaultJourneyRulesetId,
  loadJourneyRulesets,
  saveDefaultJourneyRulesetId,
} from "./features/journey/storage";

const DJ_NAME_STORAGE_KEY = "combats-dj:dj-name";

export default function App() {
  const [djName, setDjName] = useState(() => localStorage.getItem(DJ_NAME_STORAGE_KEY) ?? "");
  const [journeyRulesetsState, setJourneyRulesetsState] = useState<JourneyRulesetState>(() => ({
    rulesets: loadJourneyRulesets(),
    defaultRulesetId: loadDefaultJourneyRulesetId(),
  }));

  useEffect(() => {
    localStorage.setItem(DJ_NAME_STORAGE_KEY, djName);
  }, [djName]);

  const refreshJourneyRulesets = useCallback(() => {
    setJourneyRulesetsState({
      rulesets: loadJourneyRulesets(),
      defaultRulesetId: loadDefaultJourneyRulesetId(),
    });
  }, []);

  const handleDefaultRulesetChange = useCallback(
    (nextRulesetId: string) => {
      saveDefaultJourneyRulesetId(nextRulesetId);
      refreshJourneyRulesets();
    },
    [refreshJourneyRulesets],
  );

  const defaultJourneyRuleset = useMemo(
    () =>
      journeyRulesetsState.rulesets.find((ruleset) => ruleset.id === journeyRulesetsState.defaultRulesetId) ??
      journeyRulesetsState.rulesets[0]!,
    [journeyRulesetsState.defaultRulesetId, journeyRulesetsState.rulesets],
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
        rulesets={journeyRulesetsState.rulesets}
        defaultRulesetId={journeyRulesetsState.defaultRulesetId}
        onDefaultRulesetChange={handleDefaultRulesetChange}
      />
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3.5 } }}>
        <Routes>
          <Route path="/" element={<Navigate to="/journey" replace />} />
          <Route path="/journey" element={<JourneyPage djName={djName} defaultRuleset={defaultJourneyRuleset} />} />
          <Route path="/journey/config" element={<JourneyRulesetsPage onRulesetsChange={refreshJourneyRulesets} />} />
        </Routes>
      </Container>
    </Box>
  );
}
