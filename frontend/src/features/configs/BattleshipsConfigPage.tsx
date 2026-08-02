import { useMemo, useState } from "react";
import DirectionsBoatRoundedIcon from "@mui/icons-material/DirectionsBoatRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { Alert, CircularProgress, Grid, Stack } from "@mui/material";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import { useAuth } from "../auth/useAuth";
import { battleshipsConfigTexts } from "../../texts/battleshipsConfigTexts";
import type { BattleshipsRules } from "../battleships/types";
import type { Project } from "../projects/types";
import { formatRewardPool } from "../rewards/resourceAmounts";
import {
  BattleshipsBoardRulesSection,
  BattleshipsBoardSelectionSection,
  BattleshipsFleetSection,
  BattleshipsRewardsSection,
  getBattleshipsConfigBoard,
} from "./components/BattleshipsConfigSections";
import ConfigEditorWorkspaceHeader from "./components/ConfigEditorWorkspaceHeader";
import ConfigGeneralSection from "./components/ConfigGeneralSection";
import ConfigSectionNav from "./components/ConfigSectionNav";
import ConfigSummaryCard from "./components/ConfigSummaryCard";
import { useGameConfigEditor } from "./hooks/useGameConfigEditor";
import type { BattleshipsConfigSectionId, ConfigSection } from "./types";

function isSameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getChangedSections(
  source: { name: string; description: string; rules: BattleshipsRules } | null,
  draft: { name: string; description: string; rules: BattleshipsRules } | null,
): BattleshipsConfigSectionId[] {
  if (!source || !draft) return [];

  const sourceBoard = getBattleshipsConfigBoard(source.rules);
  const draftBoard = getBattleshipsConfigBoard(draft.rules);
  const changes: Array<[BattleshipsConfigSectionId, unknown, unknown]> = [
    ["general", { name: source.name, description: source.description }, { name: draft.name, description: draft.description }],
    ["boards", source.rules.selectedBoardSize, draft.rules.selectedBoardSize],
    ["board", sourceBoard?.maxShots, draftBoard?.maxShots],
    ["fleet", sourceBoard?.ships, draftBoard?.ships],
    ["rewards", sourceBoard?.rewards, draftBoard?.rewards],
  ];

  return changes.flatMap(([section, original, current]) => (isSameValue(original, current) ? [] : [section]));
}

const sections: readonly ConfigSection<BattleshipsConfigSectionId>[] = [
  { id: "general", icon: <SettingsRoundedIcon fontSize="small" />, ...battleshipsConfigTexts.sections.details.general },
  { id: "boards", icon: <GridViewRoundedIcon fontSize="small" />, ...battleshipsConfigTexts.sections.details.boards },
  { id: "board", icon: <DirectionsBoatRoundedIcon fontSize="small" />, ...battleshipsConfigTexts.sections.details.board },
  { id: "fleet", icon: <DirectionsBoatRoundedIcon fontSize="small" />, ...battleshipsConfigTexts.sections.details.fleet },
  { id: "rewards", icon: <WorkspacePremiumRoundedIcon fontSize="small" />, ...battleshipsConfigTexts.sections.details.rewards },
];

interface BattleshipsConfigPageProps {
  selectedProject: Project | null;
}

export default function BattleshipsConfigPage({ selectedProject }: BattleshipsConfigPageProps) {
  const { configId } = useParams<{ configId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<BattleshipsConfigSectionId>("general");
  const { source, draft, error, isLoading, isSaving, isCreating, actions } = useGameConfigEditor(
    selectedProject,
    configId,
    "battleships",
    battleshipsConfigTexts.alerts,
    searchParams.get("sourceConfigId"),
  );
  const changedSections = useMemo(() => getChangedSections(source, draft), [draft, source]);

  if (!selectedProject) return <Alert severity="warning">{battleshipsConfigTexts.alerts.projectRequired}</Alert>;
  if (isLoading) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!source || !draft) return <Alert severity="warning">{battleshipsConfigTexts.alerts.notFound}</Alert>;

  const activeSectionDetails = battleshipsConfigTexts.sections.details[activeSection];
  const canEdit = isCreating || user?.role === "admin" || (!source.isSystem && source.createdByUserId === user?.id);
  const editorDisabled = isSaving || !canEdit;
  const board = getBattleshipsConfigBoard(draft.rules);
  const shipCount = board?.ships.reduce((count, ship) => count + ship.amount, 0) ?? 0;
  const summaryItems = board
    ? [
        { label: battleshipsConfigTexts.general.board, value: `${board.boardSize} × ${board.boardSize}` },
        { label: battleshipsConfigTexts.general.maxShots, value: String(board.maxShots) },
        { label: battleshipsConfigTexts.general.ships, value: String(shipCount) },
        { label: battleshipsConfigTexts.general.hitReward, value: formatRewardPool(board.rewards.hit, selectedProject.resources) },
      ]
    : [];

  async function saveConfig() {
    const saved = await actions.save();
    if (saved && isCreating) {
      navigate(`/configs/battleships/${encodeURIComponent(saved.id)}`, { replace: true });
    }
  }

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12}>
        <GamePageHeader
          breadcrumbPath="/configs"
          breadcrumbItems={[
            { label: battleshipsConfigTexts.page.gameChip, to: "/configs?gameType=battleships" },
            { label: draft.name },
          ]}
          title={draft.name}
          description={battleshipsConfigTexts.page.description}
          chips={[
            { label: battleshipsConfigTexts.page.gameChip },
            { label: battleshipsConfigTexts.page.projectChip(selectedProject.name), color: "secondary" },
            { label: battleshipsConfigTexts.page.changesChip(changedSections.length), color: changedSections.length ? "warning" : "default" },
          ]}
          actions={canEdit ? [
            { key: "save", label: battleshipsConfigTexts.page.save, icon: <SaveRoundedIcon />, onClick: () => void saveConfig(), disabled: isSaving || !changedSections.length, loading: isSaving, variant: "contained" },
            { key: "reset", label: battleshipsConfigTexts.page.reset, icon: <RefreshRoundedIcon />, onClick: actions.reset, disabled: isSaving || !changedSections.length, variant: "text", color: "inherit" },
          ] : []}
        />
      </Grid>

      {error ? <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid> : null}
      {!canEdit ? <Grid item xs={12}><Alert severity="info">Этот конфиг доступен только для просмотра. Создайте свою копию системного конфига, чтобы изменить правила.</Alert></Grid> : null}

      <Grid item xs={12} lg={4} xl={3}>
        <ConfigSectionNav<BattleshipsConfigSectionId>
          heading={battleshipsConfigTexts.sections.heading}
          description={battleshipsConfigTexts.sections.description}
          changedHint={battleshipsConfigTexts.sections.changedHint}
          sections={sections}
          activeSection={activeSection}
          changedSections={changedSections}
          onSelect={setActiveSection}
        />
      </Grid>

      <Grid item xs={12} lg={8} xl={9}>
        <Stack spacing={2.25}>
          <ConfigEditorWorkspaceHeader title={activeSectionDetails.title} description={activeSectionDetails.details} resources={selectedProject.resources} />

          {activeSection === "general" ? (
            <Stack spacing={2.25}>
              <ConfigGeneralSection
                title={battleshipsConfigTexts.general.title}
                description={battleshipsConfigTexts.general.description}
                nameLabel={battleshipsConfigTexts.general.name}
                descriptionLabel={battleshipsConfigTexts.general.configDescription}
                source={source}
                draft={draft}
                disabled={editorDisabled}
                onChange={actions.updateDraft}
              />
              <ConfigSummaryCard title={battleshipsConfigTexts.general.summaryTitle} description={battleshipsConfigTexts.general.summaryDescription} items={summaryItems} />
            </Stack>
          ) : null}
          {activeSection === "boards" ? <BattleshipsBoardSelectionSection rules={draft.rules} /> : null}
          {activeSection === "board" ? <BattleshipsBoardRulesSection rules={draft.rules} sourceRules={source.rules} disabled={editorDisabled} onChange={(rules) => actions.updateDraft({ rules })} /> : null}
          {activeSection === "fleet" ? <BattleshipsFleetSection rules={draft.rules} /> : null}
          {activeSection === "rewards" ? <BattleshipsRewardsSection rules={draft.rules} sourceRules={source.rules} resources={selectedProject.resources} disabled={editorDisabled} onChange={(rules) => actions.updateDraft({ rules })} /> : null}
        </Stack>
      </Grid>
    </Grid>
  );
}
