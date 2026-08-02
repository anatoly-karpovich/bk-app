import { useMemo, useState } from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Card, CardContent, CircularProgress, Grid, Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppChip from "../../components/ui/AppChip";
import AppTextInput from "../../components/ui/AppTextInput";
import { journeyConfigTexts } from "../../texts/journeyConfigTexts";
import type { JourneyRules } from "../journey/types";
import type { Project } from "../projects/types";
import JourneyConfigEditor from "./components/JourneyConfigEditor";
import { JourneyCellsSection, JourneyJackpotSection } from "./components/JourneyConfigPageSections";
import JourneyConfigSectionNav, { type JourneyConfigPageSectionId } from "./components/JourneyConfigSectionNav";
import { useJourneyConfigEditor } from "./hooks/useJourneyConfigEditor";

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
  const activeSectionNavigation = journeyConfigTexts.sections[activeSection];
  const bonusCount = draft.rules.cells.filter((cell) => cell.kind === "bonus").length;
  const trapCount = draft.rules.cells.filter((cell) => cell.kind === "trap").length;
  const resourceChips = selectedProject.resources.map(
    (resource) => `${resource.label} · ${resource.type === "currency" ? "валюта" : "предмет"}`,
  );

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12}>
        <GamePageHeader
          breadcrumbPath="/configs"
          breadcrumbItems={[journeyConfigTexts.page.gameChip, draft.name]}
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
          <Card>
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ md: "center" }}
                spacing={2}
              >
                <Stack spacing={0.5}>
                  <Typography variant="h5">{activeSectionDetails.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activeSectionDetails.description}
                  </Typography>
                </Stack>
                {resourceChips.length ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ md: "flex-end" }}>
                    {resourceChips.map((label) => (
                      <AppChip
                        key={label}
                        size="small"
                        label={label}
                        color="primary"
                        sx={{ bgcolor: "rgba(79, 70, 229, 0.1)", color: "primary.dark", fontWeight: 700 }}
                      />
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          {activeSection === "general" ? (
            <Stack spacing={2.25}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack spacing={0.25}>
                      <Typography variant="h5">{journeyConfigTexts.general.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {journeyConfigTexts.general.description}
                      </Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <AppTextInput
                          fullWidth
                          label={journeyConfigTexts.general.name}
                          value={draft.name}
                          changed={draft.name !== source.name}
                          disabled={isSaving}
                          required
                          onChange={(event) => actions.updateDraft({ name: event.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <AppTextInput
                          fullWidth
                          label={journeyConfigTexts.general.configDescription}
                          value={draft.description}
                          changed={draft.description !== source.description}
                          disabled={isSaving}
                          onChange={(event) => actions.updateDraft({ description: event.target.value })}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Stack
                    direction={{ xs: "column", lg: "row" }}
                    justifyContent="space-between"
                    alignItems={{ lg: "center" }}
                    spacing={2.25}
                  >
                    <Stack spacing={0.25} sx={{ maxWidth: { lg: 360 } }}>
                      <Typography variant="h5">{journeyConfigTexts.general.summaryTitle}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {journeyConfigTexts.general.summaryDescription}
                      </Typography>
                    </Stack>
                    <Grid container spacing={1.25} sx={{ flex: 1, maxWidth: { lg: 720 } }}>
                      {[
                        [journeyConfigTexts.general.map, journeyConfigTexts.general.mapValue(draft.rules.mapSize)],
                        [journeyConfigTexts.general.move, `${draft.rules.minDice}–${draft.rules.maxDice}`],
                        [
                          journeyConfigTexts.general.jackpot,
                          draft.rules.jackpot.countMode === "fixed"
                            ? String(draft.rules.jackpot.count)
                            : journeyConfigTexts.general.jackpotByPlayersValue(draft.rules.jackpot.playersPerJackpot),
                        ],
                        [
                          journeyConfigTexts.general.cells,
                          journeyConfigTexts.general.cellsValue(bonusCount, trapCount),
                        ],
                      ].map(([label, value]) => (
                        <Grid key={label} item xs={12} sm={6}>
                          <Card variant="outlined" sx={{ boxShadow: "none", bgcolor: "rgba(248, 250, 252, 0.8)" }}>
                            <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                              <Typography variant="caption" color="text.secondary">
                                {label}
                              </Typography>
                              <Typography variant="body2" fontWeight={700}>
                                {value}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
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
