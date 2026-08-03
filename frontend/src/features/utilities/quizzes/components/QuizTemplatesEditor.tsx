import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Alert, Card, CardContent, IconButton, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppTextInput from "../../../../components/ui/AppTextInput";
import type { QuizMessageTemplate, QuizMessageTemplates } from "../types";

interface Props {
  label: string;
  messageKind: "question" | "answer";
  templates: QuizMessageTemplates | null;
  questionCount: number | null;
  disabled: boolean;
  onChange: (templates: QuizMessageTemplates | null) => void;
}

const questionTemplate = "{emojiStart} Вопрос №{questionNumber}\n\n{questionText}\n\n{emojiEnd}";
const answerTemplate = "{emojiStart} Верный ответ на вопрос №{questionNumber}: {correctAnswer} {emojiEnd}";

function initialTemplates(label: string): QuizMessageTemplates {
  return { defaultTemplate: { template: label === "Вопрос" ? questionTemplate : answerTemplate, variables: {} }, questionOverrides: [] };
}

function TemplateFields({ label, value, disabled, onChange }: { label: string; value: QuizMessageTemplate; disabled: boolean; onChange: (value: QuizMessageTemplate) => void }) {
  return <Stack spacing={1}>
    <AppTextInput multiline minRows={3} label={label} value={value.template} disabled={disabled} onChange={(event) => onChange({ ...value, template: event.target.value })} />
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      <AppTextInput size="small" label="Начальный emoji" value={value.variables.emojiStart ?? ""} disabled={disabled} onChange={(event) => onChange({ ...value, variables: { ...value.variables, emojiStart: event.target.value } })} />
      <AppTextInput size="small" label="Конечный emoji" value={value.variables.emojiEnd ?? ""} disabled={disabled} onChange={(event) => onChange({ ...value, variables: { ...value.variables, emojiEnd: event.target.value } })} />
    </Stack>
  </Stack>;
}

function TemplatePreview({ template, messageKind }: { template: QuizMessageTemplate; messageKind: Props["messageKind"] }) {
  const preview = template.template.replace(/\{(\w+)\}/g, (_match, key: string) => ({
    questionNumber: "1", questionTitle: "Тестовый вопрос", questionText: "Текст тестового вопроса", attachment: "https://example.com/image.png",
    correctAnswer: "Правильный ответ", quizName: "Название викторины", hostName: "Ведущий", emojiStart: template.variables.emojiStart ?? "", emojiEnd: template.variables.emojiEnd ?? "",
  })[key] ?? "");
  return <Stack spacing={0.75}><Typography variant="caption" color="text.secondary">Предпросмотр</Typography><Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{preview || "Шаблон пока не сформирует текст."}</Typography>{messageKind === "question" && template.template.includes("{correctAnswer}") ? <Alert severity="warning">В сообщении вопроса используется {'{correctAnswer}'} — правильный ответ станет виден до завершения вопроса.</Alert> : null}</Stack>;
}

export default function QuizTemplatesEditor({ label, messageKind, templates, questionCount, disabled, onChange }: Props) {
  if (!templates) {
    return <Stack direction="row" spacing={1} alignItems="center"><Typography color="text.secondary">Шаблоны ещё не заданы.</Typography><AppPillButton disabled={disabled} onClick={() => onChange(initialTemplates(label))}>Добавить шаблоны</AppPillButton></Stack>;
  }
  const addOverride = () => {
    const used = new Set(templates.questionOverrides.map((item) => item.questionIndex));
    const index = Array.from({ length: questionCount ?? 0 }, (_value, offset) => offset + 1).find((value) => !used.has(value));
    if (index) onChange({ ...templates, questionOverrides: [...templates.questionOverrides, { questionIndex: index, template: { ...templates.defaultTemplate, variables: { ...templates.defaultTemplate.variables } } }] });
  };
  return <Stack spacing={1.5}>
    <TemplateFields label={`Шаблон: ${label}`} value={templates.defaultTemplate} disabled={disabled} onChange={(defaultTemplate) => onChange({ ...templates, defaultTemplate })} />
    <TemplatePreview template={templates.defaultTemplate} messageKind={messageKind} />
    {templates.questionOverrides.map((override, index) => <Card variant="outlined" key={`${override.questionIndex}-${index}`}><CardContent><Stack spacing={1.25}>
      <Stack direction="row" spacing={1} alignItems="center"><AppTextInput size="small" type="number" label="Номер вопроса" value={override.questionIndex} disabled={disabled} inputProps={{ min: 1, max: questionCount ?? undefined }} onChange={(event) => onChange({ ...templates, questionOverrides: templates.questionOverrides.map((item, itemIndex) => itemIndex === index ? { ...item, questionIndex: Number(event.target.value) } : item) })} /><IconButton aria-label="Удалить переопределение шаблона" color="error" disabled={disabled} onClick={() => onChange({ ...templates, questionOverrides: templates.questionOverrides.filter((_item, itemIndex) => itemIndex !== index) })}><DeleteOutlineRoundedIcon /></IconButton></Stack>
      <TemplateFields label="Переопределение" value={override.template} disabled={disabled} onChange={(template) => onChange({ ...templates, questionOverrides: templates.questionOverrides.map((item, itemIndex) => itemIndex === index ? { ...item, template } : item) })} />
      <TemplatePreview template={override.template} messageKind={messageKind} />
    </Stack></CardContent></Card>)}
    <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={disabled || !questionCount || templates.questionOverrides.length >= questionCount} onClick={addOverride} sx={{ alignSelf: "flex-start" }}>Переопределить вопрос</AppPillButton>
  </Stack>;
}
