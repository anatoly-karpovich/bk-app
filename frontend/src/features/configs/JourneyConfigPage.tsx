import { useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, CircularProgress, Grid, Stack } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import { journeyConfigTexts } from "../../texts/journeyConfigTexts";
import type { JourneyRules } from "../journey/types";
import type { Project } from "../projects/types";
import ConfigEditorWorkspaceHeader from "./components/ConfigEditorWorkspaceHeader";
import ConfigGeneralSection from "./components/ConfigGeneralSection";
import ConfigSummaryCard from "./components/ConfigSummaryCard";
import JourneyConfigEditor from "./components/JourneyConfigEditor";
import { JourneyCellsSection, JourneyJackpotSection } from "./components/JourneyConfigPageSections";
import JourneyConfigSectionNav from "./components/JourneyConfigSectionNav";
import { useJourneyConfigEditor } from "./hooks/useJourneyConfigEditor";
import type { JourneyConfigPageSectionId } from "./types";

function isSameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getChangedSections(
  source: { name: string; description: string; rules: JourneyRules } | null,
  draft: { name: string; description: string; rules: JourneyRules } | null,
): JourneyConfigPageSectionId[] {
  if (!source || !draft) {
    return [];
  }

  const changes: Array<[JourneyConfigPageSectionId, unknown, unknown]> = [
    [
      "general",
      { name: source.name, description: source.description },
      { name: draft.name, description: draft.description },
    ],
    [
      "map",
      {
        mapSize: source.rules.mapSize,
        minDice: source.rules.minDice,
        maxDice: source.rules.maxDice,
        resourceLimits: source.rules.resourceLimits,
      },
      {
        mapSize: draft.rules.mapSize,
        minDice: draft.rules.minDice,
        maxDice: draft.rules.maxDice,
        resourceLimits: draft.rules.resourceLimits,
      },
    ],
    ["rewards", source.rules.initialRewardPool, draft.rules.initialRewardPool],
    ["jackpot", source.rules.jackpot, draft.rules.jackpot],
    ["cells", source.rules.cells, draft.rules.cells],
    ["achievements", source.rules.achievements, draft.rules.achievements],
  ];

  return changes.flatMap(([section, original, current]) => (isSameValue(original, current) ? [] : [section]));
}

interface JourneyConfigPageProps {
  selectedProject: Project | null;
}

export default function JourneyConfigPage({ selectedProject }: JourneyConfigPageProps) {
  const { configId } = useParams<{ configId: string }>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<JourneyConfigPageSectionId>("general");
  const { source, draft, error, isLoading, isSaving, actions } = useJourneyConfigEditor(selectedProject, configId);
  const changedSections = useMemo(() => getChangedSections(source, draft), [draft, source]);

  if (!selectedProject) {
    return <Alert severity="warning">{journeyConfigTexts.alerts.projectRequired}</Alert>;
  }

  if (isLoading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!draft || !source) {
    return <Alert severity="warning">{journeyConfigTexts.alerts.notFound}</Alert>;
  }

  const activeSectionDetails = journeyConfigTexts.sections.details[activeSection];
  const bonusCount = draft.rules.cells.filter((cell) => cell.kind === "bonus").length;
  const trapCount = draft.rules.cells.filter((cell) => cell.kind === "trap").length;

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12}>
        <GamePageHeader
          breadcrumbPath="/configs"
          breadcrumbItems={[
            { label: journeyConfigTexts.page.gameChip, to: "/configs?gameType=journey" },
            { label: draft.name },
          ]}
          title={draft.name}
          description={journeyConfigTexts.page.description}
          chips={[
            { label: journeyConfigTexts.page.gameChip },
            { label: journeyConfigTexts.page.projectChip(selectedProject.name), color: "secondary" },
            {
              label: journeyConfigTexts.page.changesChip(changedSections.length),
              color: changedSections.length ? "warning" : "default",
            },
          ]}
          actions={[
            {
              key: "save",
              label: journeyConfigTexts.page.save,
              icon: <SaveRoundedIcon />,
              onClick: () => void actions.save(),
              disabled: isSaving || !changedSections.length,
              loading: isSaving,
              variant: "contained",
            },
            {
              key: "reset",
              label: journeyConfigTexts.page.reset,
              icon: <RefreshRoundedIcon />,
              onClick: actions.reset,
              disabled: isSaving || !changedSections.length,
              variant: "text",
              color: "inherit",
            },
          ]}
        />
      </Grid>

      {error ? (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      ) : null}

      <Grid item xs={12} lg={4} xl={3}>
        <JourneyConfigSectionNav
          activeSection={activeSection}
          changedSections={changedSections}
          onSelect={setActiveSection}
        />
      </Grid>

      <Grid item xs={12} lg={8} xl={9}>
        <Stack spacing={2.25}>
          <ConfigEditorWorkspaceHeader
            title={activeSectionDetails.title}
            description={activeSectionDetails.description}
            resources={selectedProject.resources}
          />

          {activeSection === "general" ? (
            <Stack spacing={2.25}>
              <ConfigGeneralSection
                title={journeyConfigTexts.general.title}
                description={journeyConfigTexts.general.description}
                nameLabel={journeyConfigTexts.general.name}
                descriptionLabel={journeyConfigTexts.general.configDescription}
                source={source}
                draft={draft}
                disabled={isSaving}
                onChange={actions.updateDraft}
              />
              <ConfigSummaryCard
                title={journeyConfigTexts.general.summaryTitle}
                description={journeyConfigTexts.general.summaryDescription}
                items={[
                  { label: journeyConfigTexts.general.map, value: journeyConfigTexts.general.mapValue(draft.rules.mapSize) },
                  { label: journeyConfigTexts.general.move, value: `${draft.rules.minDice}–${draft.rules.maxDice}` },
                  {
                    label: journeyConfigTexts.general.jackpot,
                    value:
                      draft.rules.jackpot.countMode === "fixed"
                        ? String(draft.rules.jackpot.count)
                        : journeyConfigTexts.general.jackpotByPlayersValue(draft.rules.jackpot.playersPerJackpot),
                  },
                  {
                    label: journeyConfigTexts.general.cells,
                    value: journeyConfigTexts.general.cellsValue(bonusCount, trapCount),
                  },
                ]}
              />
            </Stack>
          ) : activeSection === "jackpot" ? (
            <JourneyJackpotSection
              rules={draft.rules}
              sourceRules={source.rules}
              resources={selectedProject.resources}
              disabled={isSaving}
              onChange={(rules) => actions.updateDraft({ rules })}
            />
          ) : activeSection === "cells" ? (
            <JourneyCellsSection
              rules={draft.rules}
              sourceRules={source.rules}
              resources={selectedProject.resources}
              disabled={isSaving}
              onChange={(rules) => actions.updateDraft({ rules })}
            />
          ) : (
            <JourneyConfigEditor
              rules={draft.rules}
              sourceRules={source.rules}
              resources={selectedProject.resources}
              disabled={isSaving}
              activeSection={activeSection}
              onChange={(rules) => actions.updateDraft({ rules })}
            />
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}
