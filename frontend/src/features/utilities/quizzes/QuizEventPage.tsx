import { useEffect, useState } from "react";
import { Alert, CircularProgress, Stack } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import AppConfirmDialog from "../../../components/ui/AppConfirmDialog";
import GamePageHeader from "../../../components/GamePageHeader";
import { useAuth } from "../../auth/useAuth";
import type { Project } from "../../projects/types";
import { quizzesApi } from "./api/quizzes.client";
import QuizEventWorkspace from "./components/QuizEventWorkspace";
import type { QuizAnswerStatus, QuizChatPreviewCandidate, QuizEvent } from "./types";

interface QuizEventPageProps {
  selectedProject: Project | null;
}

type PendingConfirmation = "complete" | "delete" | null;

export default function QuizEventPage({ selectedProject }: QuizEventPageProps) {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<QuizEvent | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);
  const projectId = selectedProject?.id;

  const load = async () => {
    if (!projectId || !eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const nextEvent = await quizzesApi.getEvent(projectId, eventId);
      setEvent(nextEvent);
      setSelectedQuestionId((current) => nextEvent.currentQuestionId ?? (nextEvent.questions.some((question) => question.id === current) ? current : (nextEvent.questions[0]?.id ?? "")));
    } catch (cause) {
      setEvent(null);
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить проведение.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [eventId, projectId]);
  const run = async (action: () => Promise<QuizEvent>) => {
    setIsLoading(true);
    setError(null);
    try {
      const nextEvent = await action();
      setEvent(nextEvent);
      setSelectedQuestionId((current) => nextEvent.currentQuestionId ?? (nextEvent.questions.some((question) => question.id === current) ? current : (nextEvent.questions[0]?.id ?? "")));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить проведение.");
    } finally {
      setIsLoading(false);
    }
  };
  const previewChatFragment = async (questionId: string, rawText: string): Promise<QuizChatPreviewCandidate[] | null> => {
    if (!projectId || !event) return null;
    setIsLoading(true);
    setError(null);
    try {
      return await quizzesApi.previewFragment(projectId, event.id, questionId, rawText);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось разобрать фрагмент чата.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  const remove = async () => {
    if (!projectId || !event) return;
    setIsLoading(true);
    setError(null);
    try {
      await quizzesApi.deleteEvent(projectId, event.id);
      navigate("/quizzes", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить проведение.");
    } finally {
      setIsLoading(false);
      setPendingConfirmation(null);
    }
  };

  if (!selectedProject) return <Alert severity="warning">Выберите проект, чтобы открыть проведение.</Alert>;
  if (isLoading && !event) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  if (error && !event) return <Alert severity="error">{error}</Alert>;
  if (!event) return <Alert severity="warning">Проведение не найдено.</Alert>;

  const editable = user?.role === "admin" || event.hostUserId === user?.id;
  const progress = event.questions.filter((question) => question.status === "completed" || question.status === "skipped").length;

  return (
    <Stack spacing={3}>
      <GamePageHeader
        breadcrumbPath="/quizzes"
        breadcrumbItems={[{ label: "Проведение" }, { label: event.name }]}
        title={event.name}
        description="Публикуйте сообщения, импортируйте чат и фиксируйте решения по ответам."
        chips={[{ label: `Проект: ${selectedProject.name}` }, { label: `Вопросов: ${progress}/${event.questions.length}`, color: "secondary" }, { label: `Ведущий: ${event.hostSnapshot.nickname}`, color: "secondary" }]}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!editable ? <Alert severity="info">Это проведение доступно только для просмотра.</Alert> : null}
      <QuizEventWorkspace
        event={event}
        selectedQuestionId={selectedQuestionId}
        busy={isLoading}
        editable={editable}
        onSelectQuestion={setSelectedQuestionId}
        onEventAction={(action) => void run(() => quizzesApi.eventAction(selectedProject.id, event.id, action))}
        onQuestionAction={(questionId, action) => void run(() => quizzesApi.questionAction(selectedProject.id, event.id, questionId, action))}
        onPreview={previewChatFragment}
        onImport={(questionId, mode, text, acceptedCanonicalKeys) => void run(() => quizzesApi.addFragment(selectedProject.id, event.id, questionId, mode, text, acceptedCanonicalKeys))}
        onStatus={(questionId, answerId, status: QuizAnswerStatus) => void run(() => quizzesApi.setAnswerStatus(selectedProject.id, event.id, questionId, answerId, status))}
        onBulkStatus={(questionId, answerIds, status) => void run(() => quizzesApi.setBulkAnswerStatus(selectedProject.id, event.id, questionId, answerIds, status))}
        onRequestComplete={() => setPendingConfirmation("complete")}
        onRequestDelete={() => setPendingConfirmation("delete")}
      />
      {pendingConfirmation === "complete" ? <AppConfirmDialog open title="Завершить проведение?" description="После завершения нельзя будет менять сообщения и решения по ответам." confirmLabel="Завершить" cancelLabel="Отмена" loading={isLoading} onClose={() => setPendingConfirmation(null)} onConfirm={() => { setPendingConfirmation(null); void run(() => quizzesApi.eventAction(selectedProject.id, event.id, "complete")); }} /> : null}
      {pendingConfirmation === "delete" ? <AppConfirmDialog open title="Удалить проведение?" description="Промежуточные результаты и история ответов будут удалены без возможности восстановления." confirmLabel="Удалить" cancelLabel="Отмена" confirmColor="error" loading={isLoading} onClose={() => setPendingConfirmation(null)} onConfirm={() => void remove()} /> : null}
    </Stack>
  );
}
