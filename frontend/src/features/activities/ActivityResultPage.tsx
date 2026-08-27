import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, CircularProgress, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import { useProjectPlayers } from "../players/hooks/useProjectPlayers";
import type { Project } from "../projects/types";
import { getActivityDraftIssues, isActivityDraftDirty } from "./activityResult.helpers";
import ActivityResultEditor from "./components/ActivityResultEditor";
import { useActivityResult } from "./hooks/useActivityResult";

interface ActivityResultPageProps {
  selectedProject: Project | null;
}

export default function ActivityResultPage({ selectedProject }: ActivityResultPageProps) {
  const { activityId } = useParams<{ activityId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectPlayers = useProjectPlayers(selectedProject?.id);
  const { source, draft, setDraft, isLoading, isSaving, error, load, save, remove, reset } = useActivityResult(
    selectedProject?.id,
    activityId,
    selectedProject?.activityTypes ?? [],
  );
  const [confirm, setConfirm] = useState<"reset" | "delete" | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const readOnly = searchParams.get("mode") === "view";
  const isDirty = !readOnly && isActivityDraftDirty(source, draft);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  if (!selectedProject) return <Alert severity="warning">Выберите проект, чтобы открыть активность.</Alert>;
  if (isLoading && !draft) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  if (error && !draft) return <Alert severity="error">{error}</Alert>;
  if (!draft) return <Alert severity="warning">Активность не найдена или в проекте нет доступных форматов для новой записи.</Alert>;

  const isNew = !source;
  const title = draft.title || (isNew ? "Новая активность" : "Без названия");
  const canManage = !readOnly && (source ? source.access.canUpdate : true);
  const saveDisabled = !canManage || isSaving || Boolean(getActivityDraftIssues(draft).length) || (!isNew && !isDirty);
  const saveActivity = async () => {
    const saved = await save();
    if (!saved) return;
    setSavedMessage(isNew ? "Активность сохранена и учтена в Analytics." : "Изменения сохранены, Analytics-факт обновлён.");
    if (isNew) navigate(`/activities/${encodeURIComponent(saved.id)}`, { replace: true });
  };
  const confirmAction = async () => {
    if (confirm === "reset") {
      reset();
      setConfirm(null);
      return;
    }
    if (confirm === "delete") {
      const removed = await remove();
      if (removed) navigate("/activities", { replace: true });
      else setConfirm(null);
    }
  };

  return (
    <Stack spacing={2.75}>
      <GamePageHeader
        breadcrumbPath="/activities"
        breadcrumbItems={[{ label: isNew ? "Создание" : title }]}
        title={title}
        description={readOnly ? "Просмотр сохранённого результата мероприятия без возможности изменения." : "Введите только итоговые награды мероприятия. После каждого сохранения Analytics использует актуальный результат."}
        chips={[
          { label: `Проект: ${selectedProject.name}` },
          { label: source ? `Версия: ${source.revision}` : "Новая активность", color: source ? "secondary" : "warning" },
          ...(isDirty ? [{ label: "Есть изменения", color: "warning" as const }] : []),
        ]}
        actions={[
          ...(source ? [{ key: "refresh", label: "Обновить", icon: <RefreshRoundedIcon />, onClick: () => void load(), disabled: isLoading || isSaving, loading: isLoading, variant: "text" as const, color: "inherit" as const }] : []),
          ...(source && canManage && source.access.canDelete ? [{ key: "delete", label: "Удалить", icon: <DeleteOutlineRoundedIcon />, onClick: () => setConfirm("delete"), disabled: isSaving, variant: "text" as const, color: "error" as const }] : []),
          ...(canManage ? [{ key: "save", label: isNew ? "Сохранить активность" : "Сохранить изменения", icon: <SaveRoundedIcon />, onClick: () => void saveActivity(), disabled: saveDisabled, loading: isSaving, variant: "contained" as const }] : []),
        ]}
      />
      {savedMessage ? <Alert severity="success" onClose={() => setSavedMessage(null)}>{savedMessage}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <ActivityResultEditor
        project={selectedProject}
        source={source}
        draft={draft}
        readOnly={readOnly}
        players={projectPlayers.players}
        playersLoading={projectPlayers.isLoading}
        playersError={projectPlayers.error}
        isSaving={isSaving}
        onChange={setDraft}
        onSave={() => void saveActivity()}
        onReset={() => setConfirm("reset")}
      />
      <AppConfirmDialog
        open={confirm !== null}
        title={confirm === "delete" ? "Удалить активность?" : "Сбросить изменения?"}
        description={confirm === "delete" ? "Результат и его Analytics-факт будут удалены без возможности восстановления." : "Несохранённые изменения будут потеряны."}
        confirmLabel={confirm === "delete" ? "Удалить" : "Сбросить"}
        cancelLabel="Отмена"
        confirmColor={confirm === "delete" ? "error" : "warning"}
        loading={isSaving}
        onClose={() => setConfirm(null)}
        onConfirm={() => void confirmAction()}
      />
    </Stack>
  );
}
