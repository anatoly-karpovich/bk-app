import { useState } from "react";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import { Alert, CircularProgress, IconButton, Menu, MenuItem, Stack } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import AppConfirmDialog from "../../../components/ui/AppConfirmDialog";
import GamePageHeader from "../../../components/GamePageHeader";
import AppPillButton from "../../../components/ui/AppPillButton";
import { useAuth } from "../../auth/useAuth";
import type { Project } from "../../projects/types";
import QuizEventWorkspace from "./components/QuizEventWorkspace";
import { useQuizEvent } from "./hooks/useQuizEvent";

interface QuizEventPageProps {
  selectedProject: Project | null;
}

type PendingConfirmation = "complete" | "delete" | null;

export default function QuizEventPage({ selectedProject }: QuizEventPageProps) {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);
  const [eventActionsAnchor, setEventActionsAnchor] = useState<HTMLElement | null>(null);
  const quizEvent = useQuizEvent(selectedProject?.id, eventId);
  const { event } = quizEvent;

  if (!selectedProject) return <Alert severity="warning">Выберите проект, чтобы открыть проведение.</Alert>;
  if (quizEvent.loading && !event) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  if (quizEvent.error && !event) return <Alert severity="error">{quizEvent.error}</Alert>;
  if (!event) return <Alert severity="warning">Проведение не найдено.</Alert>;

  const editable = user?.role === "admin" || event.hostUserId === user?.id;
  const busy = quizEvent.loading || quizEvent.mutationBusy;
  const remove = async () => {
    if (await quizEvent.actions.delete()) navigate("/quizzes", { replace: true });
    setPendingConfirmation(null);
  };

  return (
    <Stack spacing={3}>
      <GamePageHeader
        breadcrumbPath="/quizzes"
        breadcrumbItems={[{ label: "Проведение" }, { label: event.name }]}
        title={event.name}
        description="Публикуйте сообщения, импортируйте чат и фиксируйте верные ответы игроков."
        chips={[
          { label: event.status === "completed" ? "Завершено" : "Открыто", color: event.status === "completed" ? "default" : "success" },
          { label: `Проведено: ${event.conductedQuestionsCount}/${event.preparedQuestionsCount}`, color: "secondary" },
          { label: `Проверено: ${event.reviewedQuestionsCount}/${event.preparedQuestionsCount}`, color: "secondary" },
          { label: `Ведущий: ${event.hostSnapshot.nickname}` },
        ]}
        controls={editable ? (
          <>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
              <AppPillButton
                variant={event.status === "open" ? "contained" : "outlined"}
                disabled={busy}
                onClick={event.status === "open" ? () => setPendingConfirmation("complete") : () => void quizEvent.actions.reopen()}
              >
                {event.status === "open" ? "Завершить проведение" : "Открыть для редактирования"}
              </AppPillButton>
              <IconButton
                aria-label="Действия с проведением"
                onClick={(menuEvent) => setEventActionsAnchor(menuEvent.currentTarget)}
                sx={{ border: 1, borderColor: "divider", bgcolor: "background.paper" }}
              >
                <MoreHorizRoundedIcon />
              </IconButton>
            </Stack>
            <Menu anchorEl={eventActionsAnchor} open={Boolean(eventActionsAnchor)} onClose={() => setEventActionsAnchor(null)}>
              <MenuItem
                sx={{ color: "error.main" }}
                onClick={() => { setEventActionsAnchor(null); setPendingConfirmation("delete"); }}
              >
                Удалить проведение
              </MenuItem>
            </Menu>
          </>
        ) : undefined}
        cardSx={{
          position: "relative",
          overflow: "hidden",
          minHeight: { md: 190 },
          "&::after": {
            content: '""',
            position: "absolute",
            width: 420,
            height: 420,
            right: -120,
            bottom: -180,
            borderRadius: "50%",
            bgcolor: "rgba(104, 124, 255, 0.08)",
          },
          "& > *": { position: "relative", zIndex: 1 },
        }}
      />
      {quizEvent.error ? <Alert severity="error">{quizEvent.error}</Alert> : null}
      {!editable ? <Alert severity="info">Это проведение доступно только для просмотра.</Alert> : null}
      <QuizEventWorkspace
        event={event}
        selectedQuestionId={quizEvent.selectedQuestionId}
        selectionDrafts={quizEvent.selectionDrafts}
        isSelectionDraftDirty={quizEvent.isSelectionDraftDirty}
        busy={busy}
        editable={editable}
        onSelectQuestion={quizEvent.selectQuestion}
        onPlayerSelected={quizEvent.setPlayerSelected}
        onPlayerSelectedMessage={quizEvent.setPlayerSelectedMessage}
        onSaveResult={(questionId) => void quizEvent.actions.saveQuestionResult(questionId)}
        onSaveChat={(questionId, rawText) => quizEvent.actions.saveQuestionChat(questionId, rawText)}
        onMarkAsNotConducted={(questionId) => void quizEvent.actions.markAsNotConducted(questionId)}
        onMarkAsUnreviewed={(questionId) => void quizEvent.actions.markAsUnreviewed(questionId)}
      />
      {pendingConfirmation === "complete" ? <AppConfirmDialog open title="Завершить проведение?" description="Завершить можно только после сохранения результата каждого проведённого вопроса." confirmLabel="Завершить" cancelLabel="Отмена" loading={busy} onClose={() => setPendingConfirmation(null)} onConfirm={() => { setPendingConfirmation(null); void quizEvent.actions.complete(); }} /> : null}
      {pendingConfirmation === "delete" ? <AppConfirmDialog open title="Удалить проведение?" description="Промежуточные результаты и история ответов будут удалены без возможности восстановления." confirmLabel="Удалить" cancelLabel="Отмена" confirmColor="error" loading={busy} onClose={() => setPendingConfirmation(null)} onConfirm={() => void remove()} /> : null}
    </Stack>
  );
}
