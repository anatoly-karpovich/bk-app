import { useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Card, CardContent, CircularProgress, FormControl, InputAdornment, MenuItem, Select, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../../components/GamePageHeader";
import AppConfirmDialog from "../../../components/ui/AppConfirmDialog";
import AppTextInput from "../../../components/ui/AppTextInput";
import { useAuth } from "../../auth/useAuth";
import type { Project } from "../../projects/types";
import { quizzesApi } from "./api/quizzes.client";
import QuizLibraryCard from "./components/QuizLibraryCard";
import { getQuizAuthorLabel } from "./quizAuthor.helpers";
import { getQuizEvent, getQuizLibraryStatus, type QuizLibraryStatus } from "./quizLibrary.helpers";
import type { Quiz, QuizEvent } from "./types";

interface Props {
  selectedProject: Project | null;
}

export default function QuizzesPage({ selectedProject }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [events, setEvents] = useState<QuizEvent[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | QuizLibraryStatus>("all");
  const [authorId, setAuthorId] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Quiz | null>(null);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const projectId = selectedProject?.id;

  const load = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [nextQuizzes, nextEvents] = await Promise.all([quizzesApi.list(projectId), quizzesApi.listEvents(projectId)]);
      setQuizzes(nextQuizzes);
      setEvents(nextEvents);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить викторины.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [projectId]);

  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const authors = useMemo(() => quizzes.reduce<Map<string, string>>((result, quiz) => {
    if (!result.has(quiz.createdByUserId)) result.set(quiz.createdByUserId, getQuizAuthorLabel(quiz.createdByNickname));
    return result;
  }, new Map()), [quizzes]);
  const libraryItems = useMemo(() => quizzes.map((quiz) => {
    const event = getQuizEvent(quiz, eventsById);
    return { quiz, event, status: getQuizLibraryStatus(quiz, event), authorLabel: getQuizAuthorLabel(quiz.createdByNickname) };
  }), [eventsById, quizzes]);
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return libraryItems.filter((item) => {
      const matchesQuery = !normalizedQuery || `${item.quiz.name} ${item.quiz.description} ${item.quiz.configRulesSnapshot.configName} ${item.authorLabel}`.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (status === "all" || item.status === status) && (authorId === "all" || item.quiz.createdByUserId === authorId);
    });
  }, [authorId, libraryItems, query, status]);
  const stats = useMemo(() => ({
    ready: libraryItems.filter((item) => item.status === "ready").length,
    draft: libraryItems.filter((item) => item.status === "draft").length,
    completed: libraryItems.filter((item) => item.status === "completed").length,
  }), [libraryItems]);

  const deleteQuiz = async () => {
    if (!projectId || !pendingDelete) return;
    try {
      await quizzesApi.deleteQuiz(projectId, pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить викторину.");
    }
  };
  const startEvent = async (quiz: Quiz) => {
    if (!projectId || quiz.status !== "ready" || quiz.eventId) return;
    setStartingQuizId(quiz.id);
    setError(null);
    try {
      const event = await quizzesApi.createEvent(projectId, quiz.id);
      navigate(`/quizzes/events/${encodeURIComponent(event.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось начать проведение.");
    } finally {
      setStartingQuizId(null);
    }
  };

  if (!selectedProject) return <Alert severity="warning">Выберите проект, чтобы просматривать его викторины.</Alert>;

  return (
    <Stack spacing={2.75}>
      <GamePageHeader
        breadcrumbPath="/quizzes"
        title="Викторины"
        description="Создавайте викторины из готовых конфигов, редактируйте вопросы и запускайте проведение."
        chips={[
          { label: `Проект: ${selectedProject.name}` },
          { label: `Всего: ${quizzes.length}`, color: "secondary" },
          { label: `Готово: ${stats.ready}`, color: "success" },
          { label: `Черновики: ${stats.draft}`, color: "warning" },
          { label: `Проведено: ${stats.completed}` },
        ]}
        actions={[
          { key: "refresh", label: "Обновить", icon: <RefreshRoundedIcon />, onClick: () => void load(), loading: isLoading, variant: "text", color: "inherit" },
          { key: "create", label: "Создать", icon: <AddRoundedIcon />, onClick: () => navigate("/quizzes/create"), variant: "outlined" },
        ]}
        cardSx={{ position: "relative", overflow: "hidden", minHeight: { md: 224 }, "&::after": { content: '\"\"', position: "absolute", width: 420, height: 420, right: -120, bottom: -180, borderRadius: "50%", bgcolor: "rgba(104, 124, 255, 0.08)" }, "& > *": { position: "relative", zIndex: 1 } }}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
          <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={2.25} alignItems={{ lg: "center" }}>
            <Stack spacing={0.5}>
              <Typography variant="h5">Библиотека викторин</Typography>
              <Typography variant="body2" color="text.secondary">Готовые можно провести, черновики — продолжить редактировать, а проведённые — открыть.</Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", lg: "auto" } }}>
              <AppTextInput size="small" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти викторину" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" color="disabled" /></InputAdornment> }} sx={{ width: { xs: "100%", sm: 240 } }} />
              <FormControl size="small" sx={{ minWidth: { sm: 190 } }}><Select value={status} onChange={(event) => setStatus(event.target.value as "all" | QuizLibraryStatus)} inputProps={{ "aria-label": "Статус викторины" }}><MenuItem value="all">Все статусы</MenuItem><MenuItem value="ready">Готовые</MenuItem><MenuItem value="draft">Черновики</MenuItem><MenuItem value="open">Идёт проведение</MenuItem><MenuItem value="completed">Проведённые</MenuItem></Select></FormControl>
              <FormControl size="small" sx={{ minWidth: { sm: 190 } }}><Select value={authorId} onChange={(event) => setAuthorId(event.target.value)} inputProps={{ "aria-label": "Автор викторины" }}><MenuItem value="all">Все авторы</MenuItem>{[...authors.entries()].map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}</Select></FormControl>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {isLoading ? <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack> : visibleItems.length ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }, gap: 2.25 }}>
          {visibleItems.map(({ quiz, event, status: itemStatus, authorLabel }) => {
            const canEdit = !event && (user?.role === "admin" || quiz.createdByUserId === user?.id);
            return <QuizLibraryCard key={quiz.id} quiz={quiz} event={event} status={itemStatus} authorLabel={authorLabel} canEdit={canEdit} canDelete={canEdit} busy={startingQuizId === quiz.id} onOpenQuiz={() => navigate(`/quizzes/${encodeURIComponent(quiz.id)}/edit`)} onOpenEvent={() => { if (event) navigate(`/quizzes/events/${encodeURIComponent(event.id)}`); }} onDelete={() => setPendingDelete(quiz)} onRun={() => void startEvent(quiz)} />;
          })}
        </Box>
      ) : (
        <Card><CardContent sx={{ py: 6, textAlign: "center" }}><Typography variant="h6">{quizzes.length ? "Ничего не найдено" : "Викторин пока нет"}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{quizzes.length ? "Измените запрос или фильтры." : "Выберите готовый конфиг и подготовьте первую викторину."}</Typography></CardContent></Card>
      )}

      {pendingDelete ? <AppConfirmDialog open title="Удалить викторину?" description={`Викторина «${pendingDelete.name || "Без названия"}» будет удалена без возможности восстановления.`} confirmLabel="Удалить" cancelLabel="Отмена" confirmColor="error" loading={isLoading} onClose={() => setPendingDelete(null)} onConfirm={() => void deleteQuiz()} /> : null}
    </Stack>
  );
}
