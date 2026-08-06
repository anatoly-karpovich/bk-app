import { useEffect, useState } from "react";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import { Alert, Card, CardContent, Chip, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import AppConfirmDialog from "../../../../components/ui/AppConfirmDialog";
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
  onSaveResult: (questionId: string) => void;
  onSaveChat: (questionId: string, rawText: string) => Promise<QuizChatMutationResult | null>;
  onMarkAsNotConducted: (questionId: string) => void;
  onMarkAsUnreviewed: (questionId: string) => void;
}

export default function QuizEventWorkspace({
  event,
  selectedQuestionId,
  selectionDrafts,
  isSelectionDraftDirty,
  busy,
  editable,
  onSelectQuestion,
  onPlayerSelected,
  onPlayerSelectedMessage,
  onSaveResult,
  onSaveChat,
  onMarkAsNotConducted,
  onMarkAsUnreviewed,
}: QuizEventWorkspaceProps) {
  const question = event.questions.find((item) => item.id === selectedQuestionId) ?? event.questions[0] ?? null;
  const [confirmMarkUnreviewed, setConfirmMarkUnreviewed] = useState(false);
  const [confirmMarkNotConducted, setConfirmMarkNotConducted] = useState(false);
  const [answersExpanded, setAnswersExpanded] = useState(true);
  const [resultExpanded, setResultExpanded] = useState(false);
  const [questionActionsAnchor, setQuestionActionsAnchor] = useState<HTMLElement | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const canMutate = editable && event.status === "open";

  useEffect(() => {
    setAnswersExpanded(question?.reviewedAt === null);
    setResultExpanded(question?.reviewedAt !== null);
    setQuestionActionsAnchor(null);
  }, [question?.id, question?.reviewedAt]);

  if (!question) return <Alert severity="info">В проведении нет вопросов.</Alert>;

  const nextQuestion = () => {
    const next = event.questions.find((item) => item.conductedOrder === null);
    if (next) onSelectQuestion(next.id);
  };

  const markAsUnreviewed = () => {
    setConfirmMarkUnreviewed(false);
    onMarkAsUnreviewed(question.id);
  };

  const markAsNotConducted = () => {
    setConfirmMarkNotConducted(false);
    onMarkAsNotConducted(question.id);
  };

  const selectQuestion = (questionId: string) => {
    setShowSummary(false);
    onSelectQuestion(questionId);
  };

  return (
    <>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="flex-start">
        <QuizEventQuestionNavigation
          questions={event.questions}
          selectedQuestionId={question.id}
          onSelectQuestion={selectQuestion}
          summary={event.summary ? `${event.reviewedQuestionsCount} проверено · ${event.summary.totalUniquePlayers} игроков` : null}
          summarySelected={showSummary}
          onSelectSummary={() => setShowSummary(true)}
        />

        {showSummary && event.summary ? <QuizEventSummary event={event} /> : <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
              <Stack spacing={2.25}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="h5">Вопрос {question.questionIndex}</Typography>
                      <Chip size="small" label={getQuizQuestionStateLabel(question)} color={getQuizQuestionStateTone(question)} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{question.questionText}</Typography>
                  </Stack>

                  {canMutate ? (
                    <>
                      <IconButton
                        aria-label="Действия с вопросом"
                        onClick={(menuEvent) => setQuestionActionsAnchor(menuEvent.currentTarget)}
                        sx={{ alignSelf: { xs: "flex-start", sm: "center" }, border: 1, borderColor: "divider" }}
                      >
                        <MoreHorizRoundedIcon />
                      </IconButton>
                      <Menu anchorEl={questionActionsAnchor} open={Boolean(questionActionsAnchor)} onClose={() => setQuestionActionsAnchor(null)}>
                        <MenuItem
                          disabled={busy || event.firstUnconductedQuestionId === null}
                          onClick={() => { setQuestionActionsAnchor(null); nextQuestion(); }}
                        >
                          Следующий вопрос
                        </MenuItem>
                        {question.conductedOrder !== null ? (
                          <MenuItem
                            disabled={busy}
                            sx={{ color: "warning.dark" }}
                            onClick={() => { setQuestionActionsAnchor(null); setConfirmMarkNotConducted(true); }}
                          >
                            Считать вопрос непроведённым
                          </MenuItem>
                        ) : null}
                      </Menu>
                    </>
                  ) : null}
                </Stack>

                <QuizMessagePreviews question={question} />
              </Stack>
            </CardContent>
          </Card>

          <QuizChatControls key={question.id} question={question} busy={busy} editable={canMutate} onSave={onSaveChat} />
          <QuizAnswerSelectionEditor
            question={question}
            draft={selectionDrafts[question.id]}
            dirty={isSelectionDraftDirty(question.id)}
            editable={canMutate && question.reviewedAt === null}
            busy={busy}
            expanded={answersExpanded}
            canRequestRecheck={canMutate && question.reviewedAt !== null}
            onRequestRecheck={() => setConfirmMarkUnreviewed(true)}
            onExpandedChange={setAnswersExpanded}
            onPlayerSelected={(playerName, isSelected) => onPlayerSelected(question.id, playerName, isSelected)}
            onPlayerSelectedMessage={(playerName, selectedMessageId) => onPlayerSelectedMessage(question.id, playerName, selectedMessageId)}
            onSave={() => onSaveResult(question.id)}
          />
          <QuizQuestionResult
            question={question}
            resources={event.quizSnapshot.resources}
            expanded={resultExpanded}
            onExpandedChange={setResultExpanded}
          />
        </Stack>}
      </Stack>

      <AppConfirmDialog
        open={confirmMarkNotConducted}
        title="Считать вопрос непроведённым?"
        description="Будет очищен факт проведения этого вопроса. Порядок последующих проведённых вопросов и связанные бонусные награды будут пересчитаны."
        confirmLabel="Считать непроведённым"
        cancelLabel="Отмена"
        confirmColor="warning"
        loading={busy}
        onClose={() => setConfirmMarkNotConducted(false)}
        onConfirm={markAsNotConducted}
      />
      <AppConfirmDialog
        open={confirmMarkUnreviewed}
        title="Считать вопрос непроверенным?"
        description="Будет очищен результат и начисленные награды. Чат и факт проведения вопроса сохранятся, чтобы вы могли сразу пересчитать результат."
        confirmLabel="Считать непроверенным"
        cancelLabel="Отмена"
        confirmColor="warning"
        loading={busy}
        onClose={() => setConfirmMarkUnreviewed(false)}
        onConfirm={markAsUnreviewed}
      />
    </>
  );
}
