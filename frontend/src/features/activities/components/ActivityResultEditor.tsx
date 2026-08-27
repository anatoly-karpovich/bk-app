import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { ProjectPlayer } from "../../players/types";
import type { Project, ProjectActivityTypeSettings } from "../../projects/types";
import ConfigEditorWorkspaceHeader from "../../configs/components/ConfigEditorWorkspaceHeader";
import ConfigSectionNav from "../../configs/components/ConfigSectionNav";
import type { ConfigSection } from "../../configs/types";
import QuizSaveBar from "../../utilities/quizzes/components/QuizSaveBar";
import { getActivityDraftIssues, isActivityDraftDirty } from "../activityResult.helpers";
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
  readOnly: boolean;
  onChange: (draft: ActivityResultDraft) => void;
  onSave: () => void;
  onReset: () => void;
}

type ActivityResultSectionId = "general" | "participants";

const sections: readonly ConfigSection<ActivityResultSectionId>[] = [
  {
    id: "general",
    icon: <EventNoteRoundedIcon fontSize="small" />,
    label: "Сведения",
    description: "Формат, название и дата",
  },
  {
    id: "participants",
    icon: <PeopleAltRoundedIcon fontSize="small" />,
    label: "Участники",
    description: "Игроки и итоговые награды",
  },
];

const workspaceCopy: Record<ActivityResultSectionId, { title: string; description: string }> = {
  general: {
    title: "Сведения об активности",
    description: "Формат группирует Analytics, а название описывает конкретное мероприятие.",
  },
  participants: {
    title: "Получатели и награды",
    description: "Добавляйте только награждённых игроков; обычные и бонусные награды сохраняются отдельно.",
  },
};

function resourcesForEditor(project: Project, source: ActivityResult | null) {
  const resources = new Map<string, { id: string; label: string; type: "currency" | "item" }>();
  for (const resource of source?.resources ?? [])
    resources.set(resource.id, { id: resource.id, label: resource.label, type: resource.type });
  for (const resource of project.resources)
    resources.set(resource.id, { id: resource.id, label: resource.label, type: resource.type });
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
  readOnly,
  onChange,
  onSave,
  onReset,
}: ActivityResultEditorProps) {
  const [titleWasEdited, setTitleWasEdited] = useState(false);
  const [activeSection, setActiveSection] = useState<ActivityResultSectionId>("general");
  const resources = useMemo(() => resourcesForEditor(project, source), [project, source]);
  const typeOptions = useMemo(() => permittedTypes(project.activityTypes, source), [project.activityTypes, source]);
  const issues = useMemo(() => getActivityDraftIssues(draft), [draft]);
  const canManage = !readOnly && (source ? source.access.canUpdate : true);
  const disabled = isSaving || !canManage;
  const changedSections = useMemo<ActivityResultSectionId[]>(() => {
    if (!source || !isActivityDraftDirty(source, draft)) return [];
    const changed: ActivityResultSectionId[] = [];
    if (
      source.draft.type !== draft.type ||
      source.draft.title !== draft.title ||
      source.draft.conductedOn !== draft.conductedOn
    )
      changed.push("general");
    if (JSON.stringify(source.draft.participants) !== JSON.stringify(draft.participants)) changed.push("participants");
    return changed;
  }, [draft, source]);
  const warningSections = useMemo<ActivityResultSectionId[]>(() => {
    const warnings: ActivityResultSectionId[] = [];
    if (!draft.type || !draft.title.trim() || !draft.conductedOn) warnings.push("general");
    if (
      issues.some(
        (issue) =>
          issue !== "Выберите формат активности." &&
          issue !== "Укажите название активности." &&
          issue !== "Укажите дату проведения активности.",
      )
    )
      warnings.push("participants");
    return warnings;
  }, [draft.title, draft.type, issues]);
  const readySections = useMemo<ActivityResultSectionId[]>(
    () => sections.map((section) => section.id).filter((section) => !warningSections.includes(section)),
    [warningSections],
  );
  const activeWorkspace = workspaceCopy[activeSection];

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
      {!resources.length ? (
        <AppInfoAlert>
          В проекте пока нет ресурсов. Добавьте ресурс в настройках проекта, чтобы указать итоговые награды.
        </AppInfoAlert>
      ) : null}
      {issues.length ? (
        <Alert severity="warning">
          <Typography variant="subtitle2" fontWeight={800}>
            Сохранение пока недоступно
          </Typography>
          <Box component="ul" sx={{ my: 0.5, pl: 2.5 }}>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </Box>
        </Alert>
      ) : null}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="flex-start">
        <Box sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0 }}>
          <Box sx={{ position: { lg: "sticky" }, top: { lg: 104 } }}>
            <ConfigSectionNav<ActivityResultSectionId>
              heading="Разделы"
              description="Результат активности"
              changedHint="Разделы доступны всегда. Сохранение станет доступно после заполнения обязательных данных."
              sections={sections}
              activeSection={activeSection}
              changedSections={changedSections}
              warningSections={warningSections}
              readySections={readySections}
              onSelect={setActiveSection}
            />
          </Box>
        </Box>
        <Stack spacing={2.25} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            {activeSection === "general" ? (
              <Card>
                <CardHeader
                  title="Основные поля"
                  subheader="Выберите аналитический формат, затем уточните название и календарную дату."
                />
                <CardContent>
                  <Stack spacing={2}>
                    <FormControl fullWidth disabled={disabled}>
                      <InputLabel id="activity-type-label">Формат</InputLabel>
                      <Select
                        labelId="activity-type-label"
                        label="Формат"
                        value={draft.type}
                        onChange={(event) => changeType(event.target.value)}
                      >
                        {typeOptions.map((setting) => (
                          <MenuItem key={setting.type} value={setting.type}>
                            {setting.defaultTitle}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <AppTextInput
                      label="Название"
                      value={draft.title}
                      onChange={(event) => {
                        setTitleWasEdited(true);
                        onChange({ ...draft, title: event.target.value });
                      }}
                      error={!draft.title.trim()}
                      disabled={disabled}
                      fullWidth
                    />
                    <AppTextInput
                      label="Календарная дата проведения"
                      type="date"
                      value={draft.conductedOn ?? ""}
                      onChange={(event) => onChange({ ...draft, conductedOn: event.target.value || null })}
                      InputLabelProps={{ shrink: true }}
                      disabled={disabled}
                      sx={{ maxWidth: { md: 340 } }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ) : null}
            {activeSection === "participants" ? (
              <ActivityParticipantEditor
                participants={draft.participants}
                resources={resources}
                projectPlayers={players}
                projectPlayersLoading={playersLoading}
                projectPlayersError={playersError}
                disabled={disabled}
                onChange={(participants) => onChange({ ...draft, participants })}
              />
            ) : null}
            {canManage ? (
              <QuizSaveBar
                dirty={source ? isActivityDraftDirty(source, draft) : true}
                loading={isSaving}
                disabled={Boolean(issues.length)}
                saveLabel={source ? "Сохранить изменения" : "Сохранить активность"}
                onSave={onSave}
                actions={
                  <AppPillButton
                    color="inherit"
                    variant="text"
                    startIcon={<RefreshRoundedIcon />}
                    disabled={isSaving}
                    onClick={onReset}
                  >
                    Сбросить
                  </AppPillButton>
                }
              />
            ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}
