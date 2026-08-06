import { useMemo, useState } from "react";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, CircularProgress, Grid, Stack } from "@mui/material";
import { useParams } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import { quizConfigsTexts } from "../../texts/quizConfigsTexts";
import { useAuth } from "../auth/useAuth";
import type { Project } from "../projects/types";
import QuizConfigEditorWorkspace from "./components/QuizConfigEditorWorkspace";
import { useQuizConfigEditor } from "./hooks/useQuizConfigEditor";
import { getChangedQuizConfigSections, getQuizConfigRequiredFields } from "./quizConfigEditor.helpers";

interface QuizConfigPageProps { selectedProject: Project | null; }

export default function QuizConfigPage({ selectedProject }: QuizConfigPageProps) {
  const { configId } = useParams<{ configId: string }>();
  const { user } = useAuth();
  const [resetOpen, setResetOpen] = useState(false);
  const { source, draft, error, isLoading, isSaving, actions } = useQuizConfigEditor(selectedProject, configId, quizConfigsTexts.editor.alerts);
  const changedSections = useMemo(() => source && draft ? getChangedQuizConfigSections(source, draft) : [], [draft, source]);
  const requiredFields = useMemo(() => draft ? getQuizConfigRequiredFields(draft, quizConfigsTexts.create.required) : [], [draft]);

  if (!selectedProject) return <Alert severity="warning">{quizConfigsTexts.editor.alerts.projectRequired}</Alert>;
  if (isLoading) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  if (error && (!source || !draft)) return <Alert severity="error">{error}</Alert>;
  if (!source || !draft) return <Alert severity="warning">{quizConfigsTexts.editor.alerts.notFound}</Alert>;

  const canEdit = user?.role === "admin" || (!source.isSystem && source.createdByUserId === user?.id);
  const disabled = isSaving || !canEdit;
  const save = () => { if (!requiredFields.length) void actions.save(); };

  return <>
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12}><GamePageHeader breadcrumbPath="/configs/quizzes" breadcrumbItems={[{ label: draft.name || quizConfigsTexts.card.untitled }]} title={draft.name || quizConfigsTexts.card.untitled} description="Настройте общие параметры, награды, бонусные вопросы и шаблоны сообщений." chips={[{ label: quizConfigsTexts.editor.configChip }, { label: quizConfigsTexts.page.projectChip(selectedProject.name), color: "secondary" }, { label: requiredFields.length ? "Черновик" : "Готов", color: requiredFields.length ? "warning" : "success" }]} actions={canEdit ? [{ key: "save", label: quizConfigsTexts.editor.save, icon: <SaveRoundedIcon />, onClick: save, disabled: disabled || !changedSections.length || Boolean(requiredFields.length), loading: isSaving, variant: "contained" }] : []} /></Grid>
      {!canEdit ? <Grid item xs={12}><Alert severity="info">{quizConfigsTexts.editor.alerts.viewOnly}</Alert></Grid> : null}
      {error ? <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid> : null}
      {canEdit && requiredFields.length ? <Grid item xs={12}><Alert severity="warning"><Stack spacing={0.5}><strong>{quizConfigsTexts.create.requiredFields}</strong><Stack component="ul" sx={{ m: 0, pl: 2 }}>{requiredFields.map((field) => <li key={field}>{field}</li>)}</Stack></Stack></Alert></Grid> : null}
      <Grid item xs={12}><QuizConfigEditorWorkspace source={source} draft={draft} selectedProject={selectedProject} changedSections={changedSections} requiredFields={requiredFields} disabled={disabled} isSaving={isSaving} saveLabel={quizConfigsTexts.editor.save} saveStateText={changedSections.length ? "Есть несохранённые изменения" : "Нет несохранённых изменений"} canReset={Boolean(changedSections.length)} onChange={actions.updateDraft} onSave={save} onReset={() => setResetOpen(true)} /></Grid>
    </Grid>
    <AppConfirmDialog open={resetOpen} title="Сбросить изменения?" description="Черновик вернётся к последней сохранённой версии конфига." confirmLabel="Сбросить" cancelLabel="Отмена" onClose={() => setResetOpen(false)} onConfirm={() => { actions.reset(); setResetOpen(false); }} />
  </>;
}
