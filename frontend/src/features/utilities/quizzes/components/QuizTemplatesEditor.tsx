import { Card, CardContent, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppResponsiveGrid from "../../../../components/ui/AppResponsiveGrid";
import AppTextInput from "../../../../components/ui/AppTextInput";
import type { QuizMessageKind, QuizMessageTemplate, QuizMessageTemplates } from "../types";

interface Props {
  label: string;
  messageKind: QuizMessageKind;
  templates: QuizMessageTemplates | null;
  questionCount: number | null;
  disabled: boolean;
  onChange: (templates: QuizMessageTemplates) => void;
}

const samples: Record<string, string> = {
  questionNumber: "1",
  questionTitle: "Тестовый вопрос",
  questionText: "Сколько будет 2+2?",
  attachment: "https://example.com/image.png",
  correctAnswer: "4",
  quizName: "Название викторины",
  hostName: "Ведущий",
};

const variablesByKind: Record<QuizMessageKind, string[]> = {
  question: ["questionNumber", "questionTitle", "questionText", "attachment", "quizName", "hostName", "emojiStart", "emojiEnd"],
  answer: ["questionNumber", "correctAnswer", "quizName", "hostName", "emojiStart", "emojiEnd"],
};

function ensureTemplates(templates: QuizMessageTemplates | null): QuizMessageTemplates {
  return templates ?? { defaultTemplate: { template: "", variables: {} }, questionOverrides: [] };
}

function getPreview(template: QuizMessageTemplate) {
  return template.template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (key === "emojiStart" || key === "emojiEnd") return template.variables[key] ?? "";
    return samples[key] ?? "";
  });
}

export default function QuizTemplatesEditor({ label, messageKind, templates, disabled, onChange }: Props) {
  const normalized = ensureTemplates(templates);
  const current = normalized.defaultTemplate;
  const update = (next: Partial<QuizMessageTemplate>) => onChange({ ...normalized, defaultTemplate: { ...current, ...next } });
  const preview = getPreview(current);

  const insertVariable = (variable: string) => update({ template: `${current.template}${current.template ? " " : ""}{${variable}}` });

  return <AppResponsiveGrid columns={{ xs: 1, lg: 2 }} gap={2}>
    <Card variant="outlined" sx={{ boxShadow: "none" }}><CardContent><Stack spacing={1.5}>
      <Typography variant="subtitle1">Шаблон {label.toLowerCase()}</Typography>
      <AppTextInput multiline minRows={5} required label="Шаблон" value={current.template} error={!current.template.trim()} disabled={disabled} onChange={(event) => update({ template: event.target.value })} />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <AppTextInput size="small" fullWidth label="Начальный emoji" value={current.variables.emojiStart ?? ""} disabled={disabled} onChange={(event) => update({ variables: { ...current.variables, emojiStart: event.target.value } })} />
        <AppTextInput size="small" fullWidth label="Конечный emoji" value={current.variables.emojiEnd ?? ""} disabled={disabled} onChange={(event) => update({ variables: { ...current.variables, emojiEnd: event.target.value } })} />
      </Stack>
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {variablesByKind[messageKind].map((variable) => <AppPillButton key={variable} size="small" variant="outlined" disabled={disabled} onClick={() => insertVariable(variable)} sx={{ minWidth: 0, px: 1, fontSize: "0.72rem" }}>{`{${variable}}`}</AppPillButton>)}
      </Stack>
    </Stack></CardContent></Card>
    <Card variant="outlined" sx={{ boxShadow: "none" }}><CardContent><Stack spacing={1.5} sx={{ height: "100%" }}>
      <Typography variant="subtitle1">Предпросмотр</Typography>
      <Stack sx={{ flex: 1, minHeight: 160, p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 1.5, bgcolor: "rgba(248, 250, 252, 0.72)" }}>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{preview || "Заполните шаблон, чтобы увидеть предпросмотр."}</Typography>
      </Stack>
    </Stack></CardContent></Card>
  </AppResponsiveGrid>;
}
