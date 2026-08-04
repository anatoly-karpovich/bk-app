import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppTextInput from "../../../../components/ui/AppTextInput";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import { isQuestionComplete, renderQuizTemplate } from "../quizEditor.helpers";
import type { Quiz, QuizConfig, QuizQuestionDraft, QuizRegularRule } from "../types";
import type { QuizDraft } from "../quizEditor.helpers";
import type { ProjectResource } from "../../../projects/types";
import type { QuizEditorSection } from "./QuizQuestionNav";

interface QuizEditorWorkspaceProps {
  draft: QuizDraft;
  quiz?: Quiz;
  config?: QuizConfig | null;
  resources?: readonly ProjectResource[];
  activeSection: QuizEditorSection;
  editable: boolean;
  hostName: string;
  onChange: (draft: QuizDraft) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Stack spacing={0.75}><Typography variant="caption" fontWeight={800} color="text.primary">{label}</Typography>{children}</Stack>;
}

function PreviewCard({ title, text }: { title: string; text: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.25, boxShadow: "none" }}>
      <CardContent sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>{title}</Typography>
        <Typography component="pre" sx={{ m: 0, mt: 1, whiteSpace: "pre-wrap", fontFamily: "inherit", overflowWrap: "anywhere", fontSize: "0.875rem" }}>{text}</Typography>
      </CardContent>
    </Card>
  );
}

function ruleLabel(rule: QuizRegularRule | null, resources: readonly ProjectResource[]) {
  if (!rule) return "Награды не заданы";
  if (rule.mode === "all_accepted") return formatResourceAmounts(rule.rewardPool.rewards, resources) || "Награды не заданы";
  return "Награды распределяются по месту";
}

function QuizRewardsRules({ draft, quiz, config, resources = [] }: Pick<QuizEditorWorkspaceProps, "draft" | "quiz" | "config" | "resources">) {
  const regularRule = config?.defaultRegularRule ?? quiz?.configRulesSnapshot.defaultRegularRule ?? null;
  const bonusRules = config?.bonusRules ?? [];

  return (
    <Card sx={{ boxShadow: "0 12px 30px rgba(28, 39, 55, 0.08)" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start", px: { xs: 2.5, md: 3 }, py: 2.25, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack spacing={0.45}>
          <Typography variant="h5">Правила наград</Typography>
          <Typography variant="body2" color="text.secondary">Источник: {draft.configName} · правила сохранены снимком и не изменятся вместе с конфигом.</Typography>
        </Stack>
        <Chip label="Read-only" size="small" color="primary" sx={{ bgcolor: "rgba(79, 70, 229, 0.1)" }} />
      </Box>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Stack spacing={1.5} sx={{ flex: 1, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2.25, bgcolor: "rgba(248, 250, 252, 0.7)" }}>
            <Stack spacing={0.35}>
              <Typography variant="subtitle2">Обычная награда</Typography>
              <Typography variant="caption" color="text.secondary">{regularRule?.mode === "all_accepted" ? "Получают все игроки, чьи ответы ведущий отметил верными." : "Награды распределяются согласно месту игрока."}</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.75, borderRadius: 1.75, bgcolor: regularRule?.mode === "all_accepted" ? "rgba(22, 135, 70, 0.1)" : "rgba(255, 216, 79, 0.17)" }}>
              <Box sx={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 1.5, bgcolor: "background.paper", fontSize: 20 }}>🪙</Box>
              <Stack>
                <Typography variant="subtitle2" color={regularRule?.mode === "all_accepted" ? "success.dark" : "text.primary"}>{ruleLabel(regularRule, resources)}</Typography>
                <Typography variant="caption" color="text.secondary">Режим: {regularRule?.mode === "all_accepted" ? "все принятые ответы" : "распределение по месту"}</Typography>
              </Stack>
            </Stack>
          </Stack>
          <Stack spacing={1.5} sx={{ flex: 1.3, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2.25, bgcolor: "rgba(248, 250, 252, 0.7)" }}>
            <Stack spacing={0.35}>
              <Typography variant="subtitle2">Бонусные награды</Typography>
              <Typography variant="caption" color="text.secondary">Бонус зависит от фактического порядка проведения вопроса и места игрока.</Typography>
            </Stack>
            {bonusRules.length ? bonusRules.map((rule) => (
              <Stack key={rule.id} direction="row" spacing={1.25} alignItems="center" sx={{ px: 1.5, py: 1.15, border: "1px solid", borderColor: "warning.light", borderRadius: 1.5, bgcolor: "rgba(255, 247, 223, 0.45)" }}>
                <Chip label={`#${rule.questionIndex}`} size="small" sx={{ minWidth: 46, bgcolor: "#ffecad", color: "#765300", fontWeight: 800 }} />
                <Stack sx={{ minWidth: 0, flex: 1 }}><Typography variant="subtitle2">{rule.position}-е место</Typography><Typography variant="caption" color="text.secondary">{rule.questionIndex}-й проведённый вопрос</Typography></Stack>
                <Typography variant="subtitle2" color="warning.dark" noWrap>{formatResourceAmounts(rule.rewardPool.rewards, resources, { showPlus: true }) || "—"}</Typography>
              </Stack>
            )) : <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>Бонусные награды не настроены.</Typography>}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function QuizEditorWorkspace({ draft, quiz, config, resources, activeSection, editable, hostName, onChange }: QuizEditorWorkspaceProps) {
  const selectedQuestion = activeSection === "general" ? null : draft.questions.find((question) => question.id === activeSection) ?? draft.questions[0];
  const updateQuestion = (question: QuizQuestionDraft, patch: Partial<QuizQuestionDraft>) => onChange({ ...draft, questions: draft.questions.map((candidate) => candidate.id === question.id ? { ...candidate, ...patch } : candidate) });

  if (!selectedQuestion) {
    return (
      <Stack spacing={2}>
        <Card sx={{ boxShadow: "0 12px 30px rgba(28, 39, 55, 0.08)" }}>
          <Box sx={{ px: { xs: 2.5, md: 3 }, py: 2.25, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h5">Общие сведения</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Название и описание отображаются в библиотеке викторин.</Typography>
          </Box>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={1.75}>
              <Field label="Название *"><AppTextInput value={draft.name} placeholder={`Новая викторина — ${draft.configName}`} disabled={!editable} onChange={(event) => onChange({ ...draft, name: event.target.value })} /></Field>
              <Field label="Описание"><AppTextInput value={draft.description} placeholder="Короткое описание викторины" disabled={!editable} multiline minRows={3} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></Field>
            </Stack>
          </CardContent>
        </Card>
        <QuizRewardsRules draft={draft} quiz={quiz} config={config} resources={resources} />
      </Stack>
    );
  }

  const previewQuestion = renderQuizTemplate(draft.questionTemplate, draft, selectedQuestion, hostName);
  const previewAnswer = renderQuizTemplate(draft.answerTemplate, draft, selectedQuestion, hostName);
  const complete = isQuestionComplete(selectedQuestion);

  return (
    <Card sx={{ boxShadow: "0 12px 30px rgba(28, 39, 55, 0.08)" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start", px: { xs: 2.5, md: 3 }, py: 2.25, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack spacing={0.45}><Typography variant="h5">Вопрос {selectedQuestion.questionIndex}</Typography><Typography variant="body2" color="text.secondary">Добавьте текст, правильный ответ и при необходимости заметку для ведущего.</Typography></Stack>
        <Chip label={complete ? "Готов" : "Не готов"} color={complete ? "success" : "warning"} size="small" />
      </Box>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={1.75}>
          {!complete ? <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ px: 1.75, py: 1.4, borderRadius: 1.75, bgcolor: "rgba(255, 247, 223, 0.9)", color: "warning.dark" }}><WarningAmberRoundedIcon fontSize="small" sx={{ mt: "1px" }} /><Typography variant="caption">Чтобы вопрос считался готовым, заполните текст вопроса и правильный ответ.</Typography></Stack> : null}
          <Field label="Текст вопроса *"><AppTextInput value={selectedQuestion.text} placeholder="Введите текст вопроса" disabled={!editable} multiline minRows={5} onChange={(event) => updateQuestion(selectedQuestion, { text: event.target.value })} /></Field>
          <Field label="Правильный ответ *"><AppTextInput value={selectedQuestion.correctAnswer ?? ""} placeholder="Введите правильный ответ" disabled={!editable} onChange={(event) => updateQuestion(selectedQuestion, { correctAnswer: event.target.value || null })} /></Field>
          <Field label="Заметка для ведущего"><AppTextInput value={selectedQuestion.notes ?? ""} placeholder="Необязательная заметка, видимая только ведущему" disabled={!editable} multiline minRows={2} onChange={(event) => updateQuestion(selectedQuestion, { notes: event.target.value || null })} /></Field>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}><Box sx={{ flex: 1 }}><PreviewCard title="Предпросмотр вопроса" text={previewQuestion} /></Box><Box sx={{ flex: 1 }}><PreviewCard title="Предпросмотр правильного ответа" text={previewAnswer} /></Box></Stack>
          {editable ? <Box sx={{ pt: 1.75, borderTop: "1px solid", borderColor: "divider", textAlign: "right" }}><AppPillButton variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => updateQuestion(selectedQuestion, { text: "", correctAnswer: null, notes: null })}>Очистить вопрос</AppPillButton></Box> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
