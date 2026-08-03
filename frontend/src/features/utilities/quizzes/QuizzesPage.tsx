import { useEffect, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Alert, Button, Card, CardContent, Chip, Divider, Grid, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import GamePageHeader from "../../../components/GamePageHeader";
import { quizConfigsApi } from "../../configs/api/quizConfigs.client";
import type { Project } from "../../projects/types";
import { quizzesApi } from "./api/quizzes.client";
import QuizEditor from "./components/QuizEditor";
import QuizEventWorkspace from "./components/QuizEventWorkspace";
import type { Quiz, QuizAnswerStatus, QuizConfig, QuizEvent, QuizMessageKind } from "./types";

interface Props {
  selectedProject: Project | null;
}

export default function QuizzesPage({ selectedProject }: Props) {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(0);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [events, setEvents] = useState<QuizEvent[]>([]);
  const [sourceConfig, setSourceConfig] = useState<QuizConfig | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [quizDraft, setQuizDraft] = useState<Quiz | null>(null);
  const [savedQuiz, setSavedQuiz] = useState<Quiz | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const projectId = selectedProject?.id ?? "";
  const configId = searchParams.get("configId");
  const selectedQuiz = quizDraft ?? quizzes.find((quiz) => quiz.id === selectedQuizId) ?? null;
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

  const load = async () => {
    if (!projectId) return;
    setBusy(true);
    setError(null);
    try {
      const [nextQuizzes, nextEvents, nextConfig] = await Promise.all([
        quizzesApi.list(projectId),
        quizzesApi.listEvents(projectId),
        configId ? quizConfigsApi.get(projectId, configId) : Promise.resolve(null),
      ]);
      const nextQuizId = nextQuizzes.some((quiz) => quiz.id === selectedQuizId)
        ? selectedQuizId
        : (nextQuizzes[0]?.id ?? "");
      const nextQuiz = nextQuizzes.find((quiz) => quiz.id === nextQuizId) ?? null;
      setQuizzes(nextQuizzes);
      setEvents(nextEvents);
      setSourceConfig(nextConfig);
      setSelectedQuizId(nextQuizId);
      setSavedQuiz(nextQuiz);
      setQuizDraft(nextQuiz ? structuredClone(nextQuiz) : null);
      setSelectedEventId((value) =>
        nextEvents.some((event) => event.id === value) ? value : (nextEvents[0]?.id ?? ""),
      );
      setSelectedQuestionId((value) =>
        nextEvents.some((event) => event.questions.some((question) => question.id === value))
          ? value
          : (nextEvents[0]?.currentQuestionId ?? nextEvents[0]?.questions[0]?.id ?? ""),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить викторины");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, [projectId, configId]);
  const isQuizDirty = Boolean(quizDraft && savedQuiz && JSON.stringify(quizDraft) !== JSON.stringify(savedQuiz));
  useEffect(() => {
    if (!isQuizDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isQuizDirty]);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить изменения");
    } finally {
      setBusy(false);
    }
  };
  const selectEvent = (event: QuizEvent) => {
    setSelectedEventId(event.id);
    setSelectedQuestionId(event.currentQuestionId ?? event.questions[0]?.id ?? "");
  };

  if (!selectedProject) return <Alert severity="info">Выберите проект, чтобы работать с викторинами.</Alert>;
  return (
    <Stack spacing={3}>
      <GamePageHeader
        breadcrumbPath="/quizzes"
        title="Викторины"
        description="Подготовка вопросов, ручная модерация ответов и ведомость наград."
        actions={[{ key: "refresh", label: "Обновить", onClick: () => void load(), disabled: busy }]}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <Tabs
          value={tab}
          onChange={(_event, value) => {
            if (
              value !== tab &&
              isQuizDirty &&
              !window.confirm("Несохранённые изменения викторины будут потеряны. Продолжить?")
            )
              return;
            setTab(value);
          }}
        >
          <Tab label="Викторины" />
          <Tab label="Проведения" />
        </Tabs>
        <Divider />
        <CardContent>
          {tab === 0 ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  {sourceConfig ? (
                    <Card variant="outlined">
                      <CardContent>
                        <Stack spacing={1}>
                          <Typography fontWeight={700}>Config: {sourceConfig.name || "Без названия"}</Typography>
                          {sourceConfig.status === "ready" ? (
                            <Button
                              variant="contained"
                              startIcon={<AddRoundedIcon />}
                              disabled={busy || isQuizDirty}
                              onClick={() =>
                                void run(() =>
                                  quizzesApi.create(
                                    projectId,
                                    sourceConfig.id,
                                    `Новая викторина — ${sourceConfig.name}`,
                                  ),
                                )
                              }
                            >
                              Создать викторину
                            </Button>
                          ) : (
                            <Alert severity="warning">Этот Config ещё не готов.</Alert>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ) : null}
                  {quizzes.map((quiz) => (
                    <Button
                      key={quiz.id}
                      variant={quiz.id === selectedQuizId ? "contained" : "outlined"}
                      onClick={() => {
                        if (
                          quiz.id !== selectedQuizId &&
                          isQuizDirty &&
                          !window.confirm("Несохранённые изменения будут потеряны. Открыть другую викторину?")
                        )
                          return;
                        setSelectedQuizId(quiz.id);
                        setSavedQuiz(quiz);
                        setQuizDraft(structuredClone(quiz));
                      }}
                      sx={{ justifyContent: "space-between" }}
                    >
                      {quiz.name || "Без названия"}
                      <Chip size="small" label={quiz.status} color={quiz.status === "ready" ? "success" : "warning"} />
                    </Button>
                  ))}
                  {!sourceConfig && !quizzes.length ? (
                    <Alert severity="info">
                      Создайте готовый Config в разделе «Конфиги → Викторины», затем выберите «Создать викторину».
                    </Alert>
                  ) : null}
                </Stack>
              </Grid>
              <Grid item xs={12} md={8}>
                {selectedQuiz ? (
                  <QuizEditor
                    quiz={selectedQuiz}
                    disabled={busy}
                    isDirty={isQuizDirty}
                    onChange={setQuizDraft}
                    onSave={() => void run(() => quizzesApi.update(projectId, selectedQuiz))}
                    onReset={() => setQuizDraft(savedQuiz ? structuredClone(savedQuiz) : null)}
                    onRun={() => void run(() => quizzesApi.createEvent(projectId, selectedQuiz.id))}
                    onDelete={() => void run(() => quizzesApi.deleteQuiz(projectId, selectedQuiz.id))}
                  />
                ) : (
                  <Alert severity="info">Выберите готовый Config в разделе конфигов, чтобы создать викторину.</Alert>
                )}
              </Grid>
            </Grid>
          ) : null}
          {tab === 1 ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  {events.map((event) => (
                    <Button
                      key={event.id}
                      variant={event.id === selectedEventId ? "contained" : "outlined"}
                      onClick={() => selectEvent(event)}
                      sx={{ justifyContent: "space-between" }}
                    >
                      <Stack alignItems="flex-start">
                        <Typography>{event.name}</Typography>
                        <Typography variant="caption">
                          {event.hostSnapshot.nickname} · {new Date(event.createdAt).toLocaleDateString("ru-RU")}
                        </Typography>
                      </Stack>
                      <Chip size="small" label={event.status} />
                    </Button>
                  ))}
                  {!events.length ? (
                    <Alert severity="info">Проведений пока нет. Нажмите «Провести» у готовой викторины.</Alert>
                  ) : null}
                </Stack>
              </Grid>
              <Grid item xs={12} md={8}>
                {selectedEvent ? (
                  <QuizEventWorkspace
                    event={selectedEvent}
                    selectedQuestionId={selectedQuestionId}
                    busy={busy}
                    onSelectQuestion={setSelectedQuestionId}
                    onEventAction={(action) =>
                      void run(() => quizzesApi.eventAction(projectId, selectedEvent.id, action))
                    }
                    onQuestionAction={(questionId, action) =>
                      void run(() => quizzesApi.questionAction(projectId, selectedEvent.id, questionId, action))
                    }
                    onReorder={(questionIds) =>
                      void run(() => quizzesApi.reorderQuestions(projectId, selectedEvent.id, questionIds))
                    }
                    onSetMessage={(questionId, messageKind, text) =>
                      void run(() => quizzesApi.setMessage(projectId, selectedEvent.id, questionId, messageKind, text))
                    }
                    onClearMessage={(questionId, messageKind) =>
                      void run(() => quizzesApi.clearMessage(projectId, selectedEvent.id, questionId, messageKind))
                    }
                    onImport={(questionId, mode, text) =>
                      void run(() => quizzesApi.addFragment(projectId, selectedEvent.id, questionId, mode, text))
                    }
                    onStatus={(questionId, answerId, status) =>
                      void run(() =>
                        quizzesApi.setAnswerStatus(projectId, selectedEvent.id, questionId, answerId, status),
                      )
                    }
                    onBulkStatus={(questionId, answerIds, status) =>
                      void run(() =>
                        quizzesApi.setBulkAnswerStatus(projectId, selectedEvent.id, questionId, answerIds, status),
                      )
                    }
                    onDelete={() => void run(() => quizzesApi.deleteEvent(projectId, selectedEvent.id))}
                  />
                ) : null}
              </Grid>
            </Grid>
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  );
}
