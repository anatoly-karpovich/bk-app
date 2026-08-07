import { useMemo, useState } from "react";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Grid, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import { quizConfigsTexts } from "../../texts/quizConfigsTexts";
import type { Project } from "../projects/types";
import type { QuizConfig } from "../utilities/quizzes/types";
import { quizConfigsApi } from "./api/quizConfigs.client";
import QuizConfigEditorWorkspace from "./components/QuizConfigEditorWorkspace";
import { getChangedQuizConfigSections, getQuizConfigRequiredFields } from "./quizConfigEditor.helpers";

type QuizConfigCreateInput = Pick<QuizConfig, "name" | "description" | "questionCount" | "defaultRegularRule" | "regularRewardOverrides" | "bonusRules" | "messageTemplates" | "answerMessageTemplates">;

function createDraft(): QuizConfig {
  return { id: "", name: "", description: "", status: "draft", questionCount: null, defaultRegularRule: null, regularRewardOverrides: [], bonusRules: [], messageTemplates: null, answerMessageTemplates: null, isSystem: false, createdByUserId: "", createdByNickname: null, updatedByUserId: "", createdAt: "", updatedAt: "", validationIssues: [] };
}

function toCreateInput(draft: QuizConfig): QuizConfigCreateInput {
  const { name, description, questionCount, defaultRegularRule, regularRewardOverrides, bonusRules, messageTemplates, answerMessageTemplates } = draft;
  return { name, description, questionCount, defaultRegularRule, regularRewardOverrides, bonusRules, messageTemplates, answerMessageTemplates };
}

interface QuizConfigCreatePageProps { selectedProject: Project | null; }

export default function QuizConfigCreatePage({ selectedProject }: QuizConfigCreatePageProps) {
  const navigate = useNavigate();
  const source = useMemo(createDraft, []);
  const [draft, setDraft] = useState<QuizConfig>(() => structuredClone(source));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const requiredFields = useMemo(() => getQuizConfigRequiredFields(draft, quizConfigsTexts.create.required), [draft]);
  const changedSections = useMemo(() => getChangedQuizConfigSections(source, draft), [draft, source]);

  if (!selectedProject) return <Alert severity="warning">{quizConfigsTexts.create.alerts.projectRequired}</Alert>;

  const updateDraft = (patch: Partial<QuizConfig>) => setDraft((current) => ({ ...current, ...patch }));
  const reset = () => { setDraft(structuredClone(source)); setError(null); setResetOpen(false); };
  const save = async () => {
    if (isSaving || requiredFields.length) return;
    setIsSaving(true); setError(null);
    try { const created = await quizConfigsApi.create(selectedProject.id, toCreateInput(draft)); navigate(`/configs/quizzes/${encodeURIComponent(created.id)}`, { replace: true }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : quizConfigsTexts.create.alerts.createFailed); }
    finally { setIsSaving(false); }
  };

  return <>
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12}><GamePageHeader breadcrumbPath="/configs/quizzes" breadcrumbItems={[{ label: quizConfigsTexts.create.title }]} title={quizConfigsTexts.create.title} description="Настройте общие параметры, награды, бонусные вопросы и шаблоны сообщений." chips={[{ label: quizConfigsTexts.editor.configChip }, { label: quizConfigsTexts.page.projectChip(selectedProject.name), color: "secondary" }, { label: "Черновик", color: "warning" }]} actions={[{ key: "create", label: quizConfigsTexts.create.create, icon: <SaveRoundedIcon />, onClick: () => void save(), disabled: isSaving || Boolean(requiredFields.length), loading: isSaving, variant: "contained" }]} /></Grid>
      {error ? <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid> : null}
      {requiredFields.length ? <Grid item xs={12}><Alert severity="warning"><Stack spacing={0.5}><strong>{quizConfigsTexts.create.requiredFields}</strong><Stack component="ul" sx={{ m: 0, pl: 2 }}>{requiredFields.map((field) => <li key={field}>{field}</li>)}</Stack></Stack></Alert></Grid> : null}
      <Grid item xs={12}><QuizConfigEditorWorkspace source={source} draft={draft} selectedProject={selectedProject} changedSections={changedSections} requiredFields={requiredFields} disabled={isSaving} isSaving={isSaving} saveLabel={quizConfigsTexts.create.create} saveStateText={changedSections.length ? "Есть несохранённые изменения" : "Заполните конфиг"} canReset={Boolean(changedSections.length)} onChange={updateDraft} onSave={() => void save()} onReset={() => setResetOpen(true)} /></Grid>
    </Grid>
    <AppConfirmDialog open={resetOpen} title="Сбросить черновик?" description="Все введённые данные будут удалены." confirmLabel="Сбросить" cancelLabel="Отмена" onClose={() => setResetOpen(false)} onConfirm={reset} />
  </>;
}
