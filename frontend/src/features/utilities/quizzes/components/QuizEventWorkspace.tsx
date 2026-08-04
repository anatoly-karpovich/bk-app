import { useState } from "react";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Alert, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import AppConfirmDialog from "../../../../components/ui/AppConfirmDialog";
import AppPillButton from "../../../../components/ui/AppPillButton";
import type { QuizAnswerSelectionDraft, QuizChatMutationResult, QuizEvent } from "../types";
import QuizAnswerSelectionEditor from "./QuizAnswerSelectionEditor";
import QuizChatControls from "./QuizChatControls";
import QuizEventQuestionNavigation from "./QuizEventQuestionNavigation";
import QuizEventSummary from "./QuizEventSummary";
import QuizMessagePreviews from "./QuizMessagePreviews";
import QuizQuestionResult from "./QuizQuestionResult";
import { getQuizQuestionStateLabel, getQuizQuestionStateTone } from "./quizEventWorkspace.helpers";

interface QuizEventWorkspaceProps {
  event: QuizEvent;
  selectedQuestionId: string;
  selectionDrafts: Record<string, QuizAnswerSelectionDraft>;
  isSelectionDraftDirty: (questionId: string) => boolean;
  busy: boolean;
  editable: boolean;
  onSelectQuestion: (id: string) => void;
  onPlayerSelected: (questionId: string, playerName: string, isSelected: boolean) => void;
  onPlayerSelectedMessage: (questionId: string, playerName: string, selectedMessageId: string) => void;
  onSaveSelections: (questionId: string) => void;
  onAppendChat: (questionId: string, rawText: string) => Promise<QuizChatMutationResult | null>;
  onReplaceChat: (questionId: string, rawText: string) => Promise<QuizChatMutationResult | null>;
  onClearChat: (questionId: string) => Promise<QuizChatMutationResult | null>;
  onReview: (questionId: string) => void;
  onUnreview: (questionId: string) => void;
  onMarkAsNotConducted: (questionId: string) => void;
  onRequestComplete: () => void;
  onReopen: () => void;
  onRequestDelete: () => void;
}

export default function QuizEventWorkspace({ event, selectedQuestionId, selectionDrafts, isSelectionDraftDirty, busy, editable, onSelectQuestion, onPlayerSelected, onPlayerSelectedMessage, onSaveSelections, onAppendChat, onReplaceChat, onClearChat, onReview, onUnreview, onMarkAsNotConducted, onRequestComplete, onReopen, onRequestDelete }: QuizEventWorkspaceProps) {
  const question = event.questions.find((item) => item.id === selectedQuestionId) ?? event.questions[0] ?? null;
  const [confirmMarkNotConducted, setConfirmMarkNotConducted] = useState(false);
  const canMutate = editable && event.status === "open";
  if (!question) return <Alert severity="info">В проведении нет вопросов.</Alert>;

  const markAsNotConducted = () => {
    setConfirmMarkNotConducted(false);
    onMarkAsNotConducted(question.id);
  };

  return <><Stack spacing={2.25}>
    <Card><CardContent><Stack spacing={1.5}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}><Stack><Typography variant="h5">{event.name}</Typography><Typography variant="body2" color="text.secondary">Ведущий: {event.hostSnapshot.nickname} · создано {new Date(event.createdAt).toLocaleString("ru-RU")}</Typography></Stack><Chip label={event.status === "completed" ? "Завершено" : "Открыто"} color={event.status === "completed" ? "success" : "info"} /></Stack><Stack direction={{ xs: "column", sm: "row" }} spacing={1}><Chip label={`Подготовлено: ${event.preparedQuestionsCount}`} /><Chip label={`Проведено: ${event.conductedQuestionsCount}`} color="secondary" /><Chip label={`Проверено: ${event.reviewedQuestionsCount}`} color="secondary" /></Stack>{editable ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>{event.status === "open" ? <AppPillButton disabled={busy} variant="outlined" onClick={onRequestComplete}>Завершить проведение</AppPillButton> : <AppPillButton disabled={busy} onClick={onReopen}>Открыть для редактирования</AppPillButton>}<AppPillButton disabled={busy} variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={onRequestDelete}>Удалить</AppPillButton></Stack> : null}</Stack></CardContent></Card>
    <Stack direction={{ xs: "column", lg: "row" }} spacing={2.25} alignItems="flex-start"><QuizEventQuestionNavigation questions={event.questions} selectedQuestionId={question.id} onSelectQuestion={onSelectQuestion} /><Stack spacing={2.25} sx={{ flex: 1, minWidth: 0 }}><Card><CardContent><Stack spacing={1.5}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }}><Typography variant="h5">Вопрос {question.questionIndex}</Typography><Chip label={getQuizQuestionStateLabel(question)} color={getQuizQuestionStateTone(question)} /></Stack>{canMutate ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>{question.reviewedAt === null ? <AppPillButton disabled={busy} onClick={() => onReview(question.id)}>Проверить и перейти к следующему</AppPillButton> : <AppPillButton disabled={busy} variant="outlined" onClick={() => onUnreview(question.id)}>Сбросить проверку</AppPillButton>}{question.conductedOrder !== null ? <AppPillButton disabled={busy} variant="outlined" color="warning" onClick={() => setConfirmMarkNotConducted(true)}>Считать вопрос непроведённым</AppPillButton> : null}</Stack> : null}<Divider /><QuizMessagePreviews question={question} /></Stack></CardContent></Card>
      <QuizChatControls key={question.id} question={question} busy={busy} editable={canMutate} onAppend={onAppendChat} onReplace={onReplaceChat} onClear={onClearChat} />
      <QuizAnswerSelectionEditor question={question} draft={selectionDrafts[question.id]} dirty={isSelectionDraftDirty(question.id)} editable={canMutate} busy={busy} onPlayerSelected={(playerName, isSelected) => onPlayerSelected(question.id, playerName, isSelected)} onPlayerSelectedMessage={(playerName, selectedMessageId) => onPlayerSelectedMessage(question.id, playerName, selectedMessageId)} onSave={() => onSaveSelections(question.id)} />
      <QuizQuestionResult question={question} resources={event.quizSnapshot.resources} />
      <QuizEventSummary event={event} />
    </Stack></Stack>
  </Stack><AppConfirmDialog open={confirmMarkNotConducted} title="Считать вопрос непроведённым?" description="Будет очищен факт проведения этого вопроса. Последующие номера проведения и связанные бонусные награды будут пересчитаны." confirmLabel="Считать непроведённым" cancelLabel="Отмена" confirmColor="warning" loading={busy} onClose={() => setConfirmMarkNotConducted(false)} onConfirm={markAsNotConducted} /></>;
}
