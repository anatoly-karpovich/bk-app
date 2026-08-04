import { useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Select, Stack, Tooltip, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AppConfirmDialog from "../../../components/ui/AppConfirmDialog";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import AppTextInput from "../../../components/ui/AppTextInput";
import GamePageHeader from "../../../components/GamePageHeader";
import { useAuth } from "../../auth/useAuth";
import type { Project } from "../../projects/types";
import { quizzesApi } from "./api/quizzes.client";
import { isQuestionComplete } from "./quizEditor.helpers";
import type { Quiz, QuizStatus } from "./types";

interface Props {
  selectedProject: Project | null;
}

function QuizCard({ quiz, canEdit, busy, onOpen, onDelete, onRun }: { quiz: Quiz; canEdit: boolean; busy: boolean; onOpen: () => void; onDelete: () => void; onRun: () => void }) {
  const completedCount = quiz.questions.filter(isQuestionComplete).length;
  const statusLabel = quiz.status === "ready" ? "Готова" : "Черновик";

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.25}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" noWrap>{quiz.name || "Без названия"}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: 40 }}>
              {quiz.description || "Описание не добавлено."}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.25} flexShrink={0}>
            <Tooltip title={canEdit ? "Редактировать" : "Просмотреть"}>
              <IconButton aria-label={canEdit ? "Редактировать викторину" : "Просмотреть викторину"} onClick={onOpen} color="primary">
                {canEdit ? <EditRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {canEdit ? (
              <Tooltip title="Удалить">
                <IconButton aria-label="Удалить викторину" onClick={onDelete} color="error"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
          <Chip size="small" label={statusLabel} color={quiz.status === "ready" ? "success" : "warning"} />
          <Chip size="small" label={`${completedCount}/${quiz.questions.length} вопросов`} />
        </Stack>

        <AppResponsiveGrid columns={{ xs: 1, sm: 2 }} gap={1} sx={{ mt: 1.25 }}>
          <Box sx={{ minHeight: 54, px: 1.25, py: 0.875, border: "1px solid", borderColor: "divider", borderRadius: 1.75, bgcolor: "rgba(248, 250, 252, 0.8)" }}>
            <Typography variant="caption" color="text.secondary">Конфиг</Typography>
            <Typography variant="body2" fontWeight={700} noWrap>{quiz.configRulesSnapshot.configName}</Typography>
          </Box>
          <Box sx={{ minHeight: 54, px: 1.25, py: 0.875, border: "1px solid", borderColor: "divider", borderRadius: 1.75, bgcolor: "rgba(248, 250, 252, 0.8)" }}>
            <Typography variant="caption" color="text.secondary">Автор</Typography>
            <Typography variant="body2" fontWeight={700} noWrap>{quiz.createdByUserId}</Typography>
          </Box>
        </AppResponsiveGrid>

        <Box sx={{ mt: "auto", pt: 1.5, display: "flex", justifyContent: "flex-end" }}>
          <AppPillButton variant="outlined" startIcon={<PlayArrowRoundedIcon />} disabled={busy || quiz.status !== "ready"} onClick={onRun}>Провести</AppPillButton>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function QuizzesPage({ selectedProject }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | QuizStatus>("all");
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
      setQuizzes(await quizzesApi.list(projectId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить викторины.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [projectId]);
  const visibleQuizzes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return quizzes.filter((quiz) => {
      const matchesQuery = !normalizedQuery || `${quiz.name} ${quiz.description} ${quiz.configRulesSnapshot.configName}`.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (status === "all" || quiz.status === status);
    });
  }, [query, quizzes, status]);

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
    if (!projectId || quiz.status !== "ready") return;
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
    <Stack spacing={3}>
      <GamePageHeader
        breadcrumbPath="/quizzes"
        title="Викторины"
        description="Подготовленные вопросы, правила из конфигов и запуск будущих проведений."
        chips={[{ label: `Проект: ${selectedProject.name}` }, { label: `Викторин: ${quizzes.length}`, color: "secondary" }]}
        actions={[
          { key: "refresh", label: "Обновить", onClick: () => void load(), loading: isLoading, variant: "text", color: "inherit" },
          { key: "create", label: "Создать", icon: <AddRoundedIcon />, onClick: () => navigate("/quizzes/create"), variant: "outlined" },
        ]}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h5">Подготовленные викторины</Typography>
              <Typography variant="body2" color="text.secondary">Откройте существующую викторину или начните новую из готового конфига.</Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", md: "auto" } }}>
              <AppTextInput size="small" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти викторину" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" color="disabled" /></InputAdornment> }} sx={{ width: { xs: "100%", sm: 260 } }} />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="quiz-status-label">Статус</InputLabel>
                <Select labelId="quiz-status-label" label="Статус" value={status} onChange={(event) => setStatus(event.target.value as "all" | QuizStatus)}>
                  <MenuItem value="all">Все</MenuItem>
                  <MenuItem value="draft">Черновики</MenuItem>
                  <MenuItem value="ready">Готовые</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {isLoading ? <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack> : visibleQuizzes.length ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "repeat(2, minmax(0, 1fr))" }, gap: 2.25 }}>
          {visibleQuizzes.map((quiz) => {
            const canEdit = user?.role === "admin" || quiz.createdByUserId === user?.id;
            return <QuizCard key={quiz.id} quiz={quiz} canEdit={canEdit} busy={startingQuizId === quiz.id} onOpen={() => navigate(`/quizzes/${encodeURIComponent(quiz.id)}/edit`)} onDelete={() => setPendingDelete(quiz)} onRun={() => void startEvent(quiz)} />;
          })}
        </Box>
      ) : (
        <Card><CardContent sx={{ py: 4, textAlign: "center" }}><Typography variant="h6">{quizzes.length ? "Ничего не найдено" : "Викторин пока нет"}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{quizzes.length ? "Измените запрос или статус-фильтр." : "Выберите готовый конфиг и подготовьте первую викторину."}</Typography></CardContent></Card>
      )}
      {pendingDelete ? <AppConfirmDialog open title="Удалить викторину?" description={`Викторина «${pendingDelete.name || "Без названия"}» будет удалена без возможности восстановления.`} confirmLabel="Удалить" cancelLabel="Отмена" confirmColor="error" loading={isLoading} onClose={() => setPendingDelete(null)} onConfirm={() => void deleteQuiz()} /> : null}
    </Stack>
  );
}
