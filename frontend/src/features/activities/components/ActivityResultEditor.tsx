import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Card, CardContent, CardHeader, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { ProjectPlayer } from "../../players/types";
import type { Project, ProjectActivityTypeSettings } from "../../projects/types";
import { getActivityDraftIssues } from "../activityResult.helpers";
import type { ActivityResult, ActivityResultDraft } from "../types";
import ActivityParticipantEditor from "./ActivityParticipantEditor";

interface ActivityResultEditorProps {
  project: Project;
  source: ActivityResult | null;
  draft: ActivityResultDraft;
  players: ProjectPlayer[];
  playersLoading: boolean;
  playersError: string | null;
  isSaving: boolean;
  onChange: (draft: ActivityResultDraft) => void;
  onSave: () => void;
  onReset: () => void;
  onDelete: () => void;
}

function resourcesForEditor(project: Project, source: ActivityResult | null) {
  const resources = new Map<string, { id: string; label: string; type: "currency" | "item" }>();
  for (const resource of source?.resources ?? []) resources.set(resource.id, { id: resource.id, label: resource.label, type: resource.type });
  for (const resource of project.resources) resources.set(resource.id, { id: resource.id, label: resource.label, type: resource.type });
  return Array.from(resources.values());
}

function permittedTypes(settings: readonly ProjectActivityTypeSettings[], source: ActivityResult | null) {
  return settings.filter((setting) => setting.enabled || setting.type === source?.draft.type);
}

export default function ActivityResultEditor({
  project,
  source,
  draft,
  players,
  playersLoading,
  playersError,
  isSaving,
  onChange,
  onSave,
  onReset,
  onDelete,
}: ActivityResultEditorProps) {
  const [titleWasEdited, setTitleWasEdited] = useState(false);
  const resources = useMemo(() => resourcesForEditor(project, source), [project, source]);
  const typeOptions = useMemo(() => permittedTypes(project.activityTypes, source), [project.activityTypes, source]);
  const issues = useMemo(() => getActivityDraftIssues(draft), [draft]);
  const canManage = source ? source.access.canUpdate : true;
  const disabled = isSaving || !canManage;

  useEffect(() => {
    const sourceTitle = source?.draft.title;
    const setting = project.activityTypes.find((candidate) => candidate.type === source?.draft.type);
    setTitleWasEdited(Boolean(sourceTitle && setting && sourceTitle !== setting.defaultTitle));
  }, [project.activityTypes, source]);

  const changeType = (type: string) => {
    const defaultTitle = project.activityTypes.find((setting) => setting.type === type)?.defaultTitle ?? draft.title;
    onChange({ ...draft, type, title: titleWasEdited ? draft.title : defaultTitle });
  };

  return (
    <Stack spacing={2.5}>
      {!canManage ? <Alert severity="info">Эта активность доступна только для просмотра.</Alert> : null}
      {!resources.length ? <AppInfoAlert>В проекте пока нет ресурсов. Добавьте ресурс в настройках проекта, чтобы указать итоговые награды.</AppInfoAlert> : null}
      {issues.length ? (
        <Alert severity="warning">
          <Typography variant="subtitle2" fontWeight={800}>Сохранение пока недоступно</Typography>
          <Box component="ul" sx={{ my: 0.5, pl: 2.5 }}>{issues.map((issue) => <li key={issue}>{issue}</li>)}</Box>
        </Alert>
      ) : null}

      <Card>
        <CardHeader title="Сведения об активности" subheader="Формат определяет категорию Analytics, а название остаётся названием конкретного мероприятия." />
        <CardContent>
          <Stack spacing={2}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel id="activity-type-label">Формат</InputLabel>
              <Select labelId="activity-type-label" label="Формат" value={draft.type} onChange={(event) => changeType(event.target.value)}>
                {typeOptions.map((setting) => <MenuItem key={setting.type} value={setting.type}>{setting.defaultTitle}</MenuItem>)}
              </Select>
            </FormControl>
            <AppTextInput
              label="Название"
              value={draft.title}
              onChange={(event) => { setTitleWasEdited(true); onChange({ ...draft, title: event.target.value }); }}
              error={!draft.title.trim()}
              helperText="Можно изменить: смена формата больше не перезапишет введённое вручную название."
              disabled={disabled}
              fullWidth
            />
            <AppTextInput
              label="Календарная дата проведения"
              type="date"
              value={draft.conductedOn ?? ""}
              onChange={(event) => onChange({ ...draft, conductedOn: event.target.value || null })}
              InputLabelProps={{ shrink: true }}
              helperText={draft.conductedOn ? "Analytics использует указанную календарную дату." : "Если оставить пустым, Analytics использует дату первого сохранения результата."}
              disabled={disabled}
              sx={{ maxWidth: { md: 340 } }}
            />
          </Stack>
        </CardContent>
      </Card>

      <ActivityParticipantEditor
        participants={draft.participants}
        resources={resources}
        projectPlayers={players}
        projectPlayersLoading={playersLoading}
        projectPlayersError={playersError}
        disabled={disabled}
        onChange={(participants) => onChange({ ...draft, participants })}
      />

      {canManage ? (
        <Paper elevation={3} sx={{ position: "sticky", bottom: 16, zIndex: 2, p: 1.25, borderRadius: (theme) => theme.customRadii.md, border: "1px solid", borderColor: "divider", bgcolor: "rgba(255, 255, 255, 0.96)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.25} alignItems={{ sm: "center" }}>
            <Typography variant="body2" color="text.secondary">{source ? `Версия ${source.revision}` : "Новый результат будет сразу учтён в Analytics."}</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              {source ? <AppPillButton color="error" variant="text" startIcon={<DeleteOutlineRoundedIcon />} disabled={isSaving} onClick={onDelete}>Удалить</AppPillButton> : null}
              <AppPillButton color="inherit" variant="outlined" startIcon={<RefreshRoundedIcon />} disabled={isSaving} onClick={onReset}>Сбросить</AppPillButton>
              <AppPillButton variant="contained" startIcon={<SaveRoundedIcon />} disabled={Boolean(issues.length) || isSaving} loading={isSaving} onClick={onSave}>{source ? "Сохранить изменения" : "Сохранить активность"}</AppPillButton>
            </Stack>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
