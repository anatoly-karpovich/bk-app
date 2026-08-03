import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Alert, Card, CardContent, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppTextInput from "../../../../components/ui/AppTextInput";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import type { Quiz, QuizQuestionDraft } from "../types";
import type { QuizDraft } from "../quizEditor.helpers";
import { isQuestionComplete, renderQuizTemplate } from "../quizEditor.helpers";
import type { QuizEditorSection } from "./QuizQuestionNav";

interface QuizEditorWorkspaceProps {
  draft: QuizDraft;
  quiz?: Quiz;
  activeSection: QuizEditorSection;
  editable: boolean;
  hostName: string;
  onChange: (draft: QuizDraft) => void;
}

function PreviewCard({ title, text }: { title: string; text: string }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="text.secondary">{title}</Typography>
        <Typography component="pre" sx={{ m: 0, mt: 0.5, whiteSpace: "pre-wrap", fontFamily: "inherit", overflowWrap: "anywhere" }}>
          {text || "Предпросмотр появится после заполнения полей."}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function QuizEditorWorkspace({ draft, quiz, activeSection, editable, hostName, onChange }: QuizEditorWorkspaceProps) {
  const selectedQuestion = activeSection === "general" ? null : draft.questions.find((question) => question.id === activeSection) ?? draft.questions[0];
  const updateQuestion = (question: QuizQuestionDraft, patch: Partial<QuizQuestionDraft>) => {
    onChange({ ...draft, questions: draft.questions.map((candidate) => candidate.id === question.id ? { ...candidate, ...patch } : candidate) });
  };

  if (!selectedQuestion) {
    const rewards = quiz?.configRulesSnapshot.defaultRegularRule.mode === "all_accepted"
      ? formatResourceAmounts(quiz.configRulesSnapshot.defaultRegularRule.rewardPool.rewards, quiz.resources)
      : "Награды распределяются по месту";

    return (
      <Stack spacing={2.25}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="h5">Общие сведения</Typography>
                <Typography variant="body2" color="text.secondary">Название и описание показываются в каталоге викторин.</Typography>
              </Stack>
              <AppTextInput label="Название *" value={draft.name} disabled={!editable} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
              <AppTextInput label="Описание" value={draft.description} disabled={!editable} multiline minRows={3} onChange={(event) => onChange({ ...draft, description: event.target.value })} />
            </Stack>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stack spacing={0.75}>
              <Typography variant="h5">Правила наград</Typography>
              <Typography variant="body2" color="text.secondary">Источник: {draft.configName}</Typography>
              <Typography>{rewards || "Награды не заданы"}</Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  const previewQuestion = renderQuizTemplate(draft.questionTemplate, draft, selectedQuestion, hostName);
  const previewAnswer = renderQuizTemplate(draft.answerTemplate, draft, selectedQuestion, hostName);
  const complete = isQuestionComplete(selectedQuestion);

  return (
    <Stack spacing={2.25}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h5">Вопрос {selectedQuestion.questionIndex}</Typography>
              <Typography variant="body2" color="text.secondary">Добавьте текст, правильный ответ и при необходимости заметку для ведущего.</Typography>
            </Stack>
            {!complete ? <Alert severity="warning">Чтобы вопрос считался готовым, заполните текст вопроса и правильный ответ.</Alert> : null}
            <AppTextInput label="Текст вопроса *" value={selectedQuestion.text} disabled={!editable} multiline minRows={5} onChange={(event) => updateQuestion(selectedQuestion, { text: event.target.value })} />
            <AppTextInput label="Правильный ответ *" value={selectedQuestion.correctAnswer ?? ""} disabled={!editable} multiline minRows={2} onChange={(event) => updateQuestion(selectedQuestion, { correctAnswer: event.target.value || null })} />
            <AppTextInput label="Заметка для ведущего" value={selectedQuestion.notes ?? ""} disabled={!editable} multiline minRows={2} onChange={(event) => updateQuestion(selectedQuestion, { notes: event.target.value || null })} />
            {editable ? <AppPillButton variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => updateQuestion(selectedQuestion, { text: "", correctAnswer: null, notes: null })}>Очистить вопрос</AppPillButton> : null}
          </Stack>
        </CardContent>
      </Card>
      <PreviewCard title="Предпросмотр вопроса" text={previewQuestion} />
      <PreviewCard title="Предпросмотр правильного ответа" text={previewAnswer} />
    </Stack>
  );
}
