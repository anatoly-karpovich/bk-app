import { useMemo, useState } from "react";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { Alert, CircularProgress, Grid, Stack } from "@mui/material";
import { useParams } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import { lottoConfigTexts } from "../../texts/lottoConfigTexts";
import type { LottoRules } from "../lotto/types";
import type { Project } from "../projects/types";
import { formatRewardPool } from "../rewards/resourceAmounts";
import ConfigEditorWorkspaceHeader from "./components/ConfigEditorWorkspaceHeader";
import ConfigGeneralSection from "./components/ConfigGeneralSection";
import ConfigSectionNav from "./components/ConfigSectionNav";
import ConfigSummaryCard from "./components/ConfigSummaryCard";
import { LottoCardRulesSection, LottoDistributionSection, LottoPrizesSection } from "./components/LottoConfigSections";
import { useGameConfigEditor } from "./hooks/useGameConfigEditor";
import type { ConfigSection, LottoConfigSectionId } from "./types";

function isSameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getChangedSections(
  source: { name: string; description: string; rules: LottoRules } | null,
  draft: { name: string; description: string; rules: LottoRules } | null,
): LottoConfigSectionId[] {
  if (!source || !draft) {
    return [];
  }

  const changes: Array<[LottoConfigSectionId, unknown, unknown]> = [
    ["general", { name: source.name, description: source.description }, { name: draft.name, description: draft.description }],
    [
      "card",
      { min: source.rules.min, max: source.rules.max, cardNumbersAmount: source.rules.cardNumbersAmount },
      { min: draft.rules.min, max: draft.rules.max, cardNumbersAmount: draft.rules.cardNumbersAmount },
    ],
    [
      "prizes",
      [source.rules.firstPlacePrize, source.rules.secondPlacePrize, source.rules.otherActivePlayersPrize],
      [draft.rules.firstPlacePrize, draft.rules.secondPlacePrize, draft.rules.otherActivePlayersPrize],
    ],
    ["distribution", source.rules.rewardDistributionMode, draft.rules.rewardDistributionMode],
  ];

  return changes.flatMap(([section, original, current]) => (isSameValue(original, current) ? [] : [section]));
}

const sections: readonly ConfigSection<LottoConfigSectionId>[] = [
  { id: "general", icon: <SettingsRoundedIcon fontSize="small" />, ...lottoConfigTexts.sections.details.general },
  { id: "card", icon: <CasinoRoundedIcon fontSize="small" />, ...lottoConfigTexts.sections.details.card },
  { id: "prizes", icon: <EmojiEventsRoundedIcon fontSize="small" />, ...lottoConfigTexts.sections.details.prizes },
  { id: "distribution", icon: <SwapHorizRoundedIcon fontSize="small" />, ...lottoConfigTexts.sections.details.distribution },
];

interface LottoConfigPageProps {
  selectedProject: Project | null;
}

export default function LottoConfigPage({ selectedProject }: LottoConfigPageProps) {
  const { configId } = useParams<{ configId: string }>();
  const [activeSection, setActiveSection] = useState<LottoConfigSectionId>("general");
  const { source, draft, error, isLoading, isSaving, actions } = useGameConfigEditor(
    selectedProject,
    configId,
    "lotto",
    lottoConfigTexts.alerts,
  );
  const changedSections = useMemo(() => getChangedSections(source, draft), [draft, source]);

  if (!selectedProject) {
    return <Alert severity="warning">{lottoConfigTexts.alerts.projectRequired}</Alert>;
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

  if (!source || !draft) {
    return <Alert severity="warning">{lottoConfigTexts.alerts.notFound}</Alert>;
  }

  const activeSectionDetails = lottoConfigTexts.sections.details[activeSection];
  const summaryItems = [
    { label: lottoConfigTexts.general.range, value: `${draft.rules.min}–${draft.rules.max}` },
    { label: lottoConfigTexts.general.cardNumbers, value: lottoConfigTexts.general.cardNumbersValue(draft.rules.cardNumbersAmount) },
    {
      label: lottoConfigTexts.general.firstPlace,
      value: formatRewardPool(draft.rules.firstPlacePrize, selectedProject.resources),
    },
    {
      label: lottoConfigTexts.general.secondPlace,
      value: formatRewardPool(draft.rules.secondPlacePrize, selectedProject.resources),
    },
  ];

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12}>
        <GamePageHeader
          breadcrumbPath="/configs"
          breadcrumbItems={[
            { label: lottoConfigTexts.page.gameChip, to: "/lotto" },
            { label: draft.name },
          ]}
          title={draft.name}
          description={lottoConfigTexts.page.description}
          chips={[
            { label: lottoConfigTexts.page.gameChip },
            { label: lottoConfigTexts.page.projectChip(selectedProject.name), color: "secondary" },
            {
              label: lottoConfigTexts.page.changesChip(changedSections.length),
              color: changedSections.length ? "warning" : "default",
            },
          ]}
          actions={[
            {
              key: "save",
              label: lottoConfigTexts.page.save,
              icon: <SaveRoundedIcon />,
              onClick: () => void actions.save(),
              disabled: isSaving || !changedSections.length,
              loading: isSaving,
              variant: "contained",
            },
            {
              key: "reset",
              label: lottoConfigTexts.page.reset,
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
        <ConfigSectionNav<LottoConfigSectionId>
          heading={lottoConfigTexts.sections.heading}
          description={lottoConfigTexts.sections.description}
          changedHint={lottoConfigTexts.sections.changedHint}
          sections={sections}
          activeSection={activeSection}
          changedSections={changedSections}
          onSelect={setActiveSection}
        />
      </Grid>

      <Grid item xs={12} lg={8} xl={9}>
        <Stack spacing={2.25}>
          <ConfigEditorWorkspaceHeader
            title={activeSectionDetails.title}
            description={activeSectionDetails.details}
            resources={selectedProject.resources}
          />

          {activeSection === "general" ? (
            <Stack spacing={2.25}>
              <ConfigGeneralSection
                title={lottoConfigTexts.general.title}
                description={lottoConfigTexts.general.description}
                nameLabel={lottoConfigTexts.general.name}
                descriptionLabel={lottoConfigTexts.general.configDescription}
                source={source}
                draft={draft}
                disabled={isSaving}
                onChange={actions.updateDraft}
              />
              <ConfigSummaryCard
                title={lottoConfigTexts.general.summaryTitle}
                description={lottoConfigTexts.general.summaryDescription}
                items={summaryItems}
              />
            </Stack>
          ) : null}

          {activeSection === "card" ? (
            <LottoCardRulesSection
              rules={draft.rules}
              sourceRules={source.rules}
              resources={selectedProject.resources}
              disabled={isSaving}
              onChange={(rules) => actions.updateDraft({ rules })}
            />
          ) : null}

          {activeSection === "prizes" ? (
            <LottoPrizesSection
              rules={draft.rules}
              sourceRules={source.rules}
              resources={selectedProject.resources}
              disabled={isSaving}
              onChange={(rules) => actions.updateDraft({ rules })}
            />
          ) : null}

          {activeSection === "distribution" ? (
            <LottoDistributionSection
              rules={draft.rules}
              sourceRules={source.rules}
              resources={selectedProject.resources}
              disabled={isSaving}
              onChange={(rules) => actions.updateDraft({ rules })}
            />
          ) : null}
        </Stack>
      </Grid>
    </Grid>
  );
}
