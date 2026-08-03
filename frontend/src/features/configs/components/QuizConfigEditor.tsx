import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { ProjectResource } from "../../projects/types";
import QuizRewardsEditor from "../../utilities/quizzes/components/QuizRewardsEditor";
import QuizTemplatesEditor from "../../utilities/quizzes/components/QuizTemplatesEditor";
import type { QuizConfig } from "../../utilities/quizzes/types";

interface Props {
  config: QuizConfig;
  resources: ProjectResource[];
  isBusy: boolean;
  isDirty: boolean;
  onChange: (config: QuizConfig) => void;
  onSave: () => void;
  onReset: () => void;
  onClone: () => void;
  onDelete: () => void;
  onCreateQuiz: () => void;
}

export default function QuizConfigEditor({ config, resources, isBusy, isDirty, onChange, onSave, onReset, onClone, onDelete, onCreateQuiz }: Props) {
  const update = (next: Partial<QuizConfig>) => onChange({ ...config, ...next });
  return <Stack spacing={2.25}>
    <Card><CardContent><Stack spacing={1.5}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "center" }}><Typography variant="h5">{config.name || "Новый конфиг викторины"}</Typography><Stack direction="row" spacing={1}><Chip label={config.status} color={config.status === "ready" ? "success" : "warning"} />{isDirty ? <Chip label="Не сохранено" color="info" /> : null}</Stack></Stack>
      <AppTextInput label="Название" value={config.name} disabled={isBusy} onChange={(event) => update({ name: event.target.value })} />
      <AppTextInput multiline minRows={2} label="Описание" value={config.description} disabled={isBusy} onChange={(event) => update({ description: event.target.value })} />
      <AppTextInput type="number" label="Количество вопросов" value={config.questionCount ?? ""} disabled={isBusy} inputProps={{ min: 1, step: 1 }} onChange={(event) => update({ questionCount: event.target.value ? Number(event.target.value) : null })} sx={{ maxWidth: 260 }} />
      {config.validationIssues.length ? <Alert severity="warning"><Stack component="ul" sx={{ m: 0, pl: 2 }}>{config.validationIssues.map((issue, index) => <li key={`${issue.path}-${index}`}>{issue.message}</li>)}</Stack></Alert> : <Alert severity="success">Конфиг готов к созданию викторины.</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><AppPillButton variant="contained" startIcon={<SaveRoundedIcon />} disabled={isBusy || !isDirty} onClick={onSave}>Сохранить</AppPillButton>{isDirty ? <AppPillButton variant="outlined" disabled={isBusy} onClick={onReset}>Сбросить изменения</AppPillButton> : null}<AppPillButton variant="outlined" disabled={isBusy || isDirty || config.status !== "ready"} onClick={onCreateQuiz}>Создать викторину</AppPillButton><AppPillButton variant="outlined" startIcon={<ContentCopyRoundedIcon />} disabled={isBusy} onClick={onClone}>Создать копию</AppPillButton><AppPillButton color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} disabled={isBusy} onClick={onDelete}>Удалить</AppPillButton></Stack>
    </Stack></CardContent></Card>
    <Card><CardContent><Stack spacing={2}><Typography variant="h5">Награды</Typography><QuizRewardsEditor questionCount={config.questionCount} resources={resources} defaultRule={config.defaultRegularRule} overrides={config.regularRewardOverrides} bonuses={config.bonusRules} disabled={isBusy} onChange={(next) => update({ defaultRegularRule: next.defaultRule, regularRewardOverrides: next.overrides, bonusRules: next.bonuses })} /></Stack></CardContent></Card>
    <Card><CardContent><Stack spacing={2}><Typography variant="h5">Сообщения</Typography><Typography variant="body2" color="text.secondary">Доступны placeholders: questionNumber, questionTitle, questionText, attachment, correctAnswer, quizName, hostName, emojiStart, emojiEnd.</Typography><Typography variant="subtitle1">Вопрос</Typography><QuizTemplatesEditor label="Вопрос" messageKind="question" templates={config.messageTemplates} questionCount={config.questionCount} disabled={isBusy} onChange={(messageTemplates) => update({ messageTemplates })} /><Typography variant="subtitle1">Правильный ответ</Typography><QuizTemplatesEditor label="Ответ" messageKind="answer" templates={config.answerMessageTemplates} questionCount={config.questionCount} disabled={isBusy} onChange={(answerMessageTemplates) => update({ answerMessageTemplates })} /></Stack></CardContent></Card>
  </Stack>;
}
