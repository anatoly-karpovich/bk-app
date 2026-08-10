import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { Alert, CircularProgress, Grid, MenuItem, Stack } from "@mui/material";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppResponsiveGrid from "../../components/ui/AppResponsiveGrid";
import AppTextInput from "../../components/ui/AppTextInput";
import type { LottoBingoRules } from "../lottoBingo/types";
import type { Project } from "../projects/types";
import ConfigGeneralSection from "./components/ConfigGeneralSection";
import ConfigEditorWorkspaceHeader from "./components/ConfigEditorWorkspaceHeader";
import ConfigSectionNav from "./components/ConfigSectionNav";
import RewardPoolEditor from "./components/RewardPoolEditor";
import RuleSection from "./components/RuleSection";
import { useGameConfigEditor } from "./hooks/useGameConfigEditor";
import type { ConfigSection } from "./types";

type SectionId = "general" | "draw" | "rewards";
const sections: readonly ConfigSection<SectionId>[] = [
  { id: "general", label: "Основное", description: "Название и описание", icon: <SettingsRoundedIcon fontSize="small" /> },
  { id: "draw", label: "Тираж", description: "Количество бочонков", icon: <CasinoRoundedIcon fontSize="small" /> },
  { id: "rewards", label: "Награды", description: "Раунды и финал", icon: <EmojiEventsRoundedIcon fontSize="small" /> },
];
const emptyPool = { mode: "all" as const, rewards: [] };
const initialRules = (): LottoBingoRules => ({ barrelsToDraw: 89, rewards: { round1: emptyPool, round2: emptyPool, round3: emptyPool, completedCard: emptyPool, consolation: emptyPool } });
const createInitialDraft = () => ({ name: "Лото Бинго", description: "", rules: initialRules() });

export default function LottoBingoConfigPage({ selectedProject }: { selectedProject: Project | null }) {
  const { configId } = useParams<{ configId: string }>();
  const [params] = useSearchParams(); const navigate = useNavigate(); const [active, setActive] = useState<SectionId>("general");
  const { source, draft, error, isLoading, isSaving, isCreating, actions } = useGameConfigEditor<"lotto_bingo">(
    selectedProject, configId, "lotto_bingo", { loadFailed: "Не удалось загрузить конфигурацию Лото Бинго.", notFound: "Конфигурация Лото Бинго не найдена." }, params.get("sourceConfigId"),
    createInitialDraft,
  );
  const changed = useMemo(() => !source || JSON.stringify({ name: source.name, description: source.description, rules: source.rules }) !== JSON.stringify(draft), [draft, source]);
  if (!selectedProject) return <Alert severity="warning">Выберите проект, чтобы редактировать конфигурацию.</Alert>;
  if (isLoading || !draft) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  const savedSource = source ?? { name: draft.name, description: draft.description, rules: draft.rules };
  const disabled = isSaving;
  const save = async () => { const saved = await actions.save(); if (saved && isCreating) navigate(`/configs/lotto_bingo/${saved.id}`, { replace: true }); };
  const updateRewards = (key: keyof LottoBingoRules["rewards"], value: LottoBingoRules["rewards"][keyof LottoBingoRules["rewards"]]) => actions.updateDraft({ rules: { ...draft.rules, rewards: { ...draft.rules.rewards, [key]: value } } });
  return <Grid container spacing={3} alignItems="flex-start">
    <Grid item xs={12}><GamePageHeader breadcrumbPath="/configs" breadcrumbItems={[{ label: "Лото Бинго", to: "/configs?gameType=lotto_bingo" }, { label: draft.name }]} title={draft.name} description="Правила новых игр. Билеты и геометрия остаются фиксированными." chips={[{ label: "Лото Бинго" }, { label: `Проект: ${selectedProject.name}`, color: "secondary" }, { label: changed ? "Есть изменения" : "Без изменений", color: changed ? "warning" : "default" }]} actions={[{ key: "save", label: "Сохранить", icon: <SaveRoundedIcon />, onClick: () => void save(), disabled: disabled || !changed, loading: isSaving, variant: "contained" }, { key: "reset", label: "Сбросить", icon: <RefreshRoundedIcon />, onClick: actions.reset, disabled: disabled || !changed, variant: "text", color: "inherit" }]} /></Grid>
    {error ? <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid> : null}
    <Grid item xs={12} lg={4} xl={3}><ConfigSectionNav heading="Разделы" description="Настройте правила игры." changedHint="Изменения сохраняются одной командой." sections={sections} activeSection={active} changedSections={changed ? [active] : []} onSelect={(section) => setActive(section)} /></Grid>
    <Grid item xs={12} lg={8} xl={9}><Stack spacing={2.25}>
      <ConfigEditorWorkspaceHeader title={sections.find((section) => section.id === active)!.label} description={sections.find((section) => section.id === active)!.description} resources={selectedProject.resources} />
      {active === "general" ? <ConfigGeneralSection title="Конфигурация" description="Используется только для новых игр." nameLabel="Название" descriptionLabel="Описание" source={savedSource} draft={draft} disabled={disabled} onChange={actions.updateDraft} /> : null}
      {active === "draw" ? <RuleSection title="Плановый тираж" description="После последнего бочонка игра финализируется; исключённые номера никогда не разыгрываются."><AppResponsiveGrid columns={{ xs: 1, sm: 2 }}><AppTextInput select label="Количество бочонков" value={draft.rules.barrelsToDraw} disabled={disabled} onChange={(event) => actions.updateDraft({ rules: { ...draft.rules, barrelsToDraw: Number(event.target.value) as 87 | 88 | 89 } })}>{[87, 88, 89].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</AppTextInput></AppResponsiveGrid></RuleSection> : null}
      {active === "rewards" ? <Stack spacing={2.25}>{([ ["round1", "Раунд 1", "Один заполненный ряд"], ["round2", "Раунд 2", "Верхняя или нижняя половина"], ["round3", "Раунд 3", "Полный билет"], ["completedCard", "Заполненный билет", "После окончания тиража"], ["consolation", "Утешительная награда", "Остальным активным игрокам"] ] as const).map(([key, title, description]) => <RuleSection key={key} title={title} description={description}><RewardPoolEditor pool={draft.rules.rewards[key]} sourcePool={savedSource.rules.rewards[key]} resources={selectedProject.resources} disabled={disabled} onChange={(pool) => updateRewards(key, pool)} /></RuleSection>)}</Stack> : null}
    </Stack></Grid>
  </Grid>;
}
