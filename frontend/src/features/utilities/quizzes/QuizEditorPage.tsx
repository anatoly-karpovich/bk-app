import { useEffect, useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, CircularProgress, Stack } from "@mui/material";
import { useParams } from "react-router-dom";
import GamePageHeader from "../../../components/GamePageHeader";
import { useAuth } from "../../auth/useAuth";
import type { Project } from "../../projects/types";
import { quizzesApi } from "./api/quizzes.client";
import QuizEditorWorkspace from "./components/QuizEditorWorkspace";
import QuizQuestionNav, { type QuizEditorSection } from "./components/QuizQuestionNav";
import { applyDraftToQuiz, createDraftFromQuiz, reorderQuestions, type QuizDraft } from "./quizEditor.helpers";
import type { Quiz } from "./types";

interface QuizEditorPageProps {
  selectedProject: Project | null;
}

export default function QuizEditorPage({ selectedProject }: QuizEditorPageProps) {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const [source, setSource] = useState<Quiz | null>(null);
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [activeSection, setActiveSection] = useState<QuizEditorSection>("general");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projectId = selectedProject?.id;

  const load = async () => {
    if (!projectId || !quizId) return;
    setIsLoading(true);
    setError(null);
    try {
      const quiz = await quizzesApi.get(projectId, quizId);
      const nextDraft = createDraftFromQuiz(quiz);
      setSource(quiz);
      setDraft(nextDraft);
      setActiveSection(nextDraft.questions[0]?.id ?? "general");
    } catch (cause) {
      setSource(null);
      setDraft(null);
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить викторину.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [projectId, quizId]);
  const isDirty = useMemo(() => Boolean(source && draft && JSON.stringify(createDraftFromQuiz(source)) !== JSON.stringify(draft)), [draft, source]);
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const canEdit = Boolean(source && (user?.role === "admin" || source.createdByUserId === user?.id));
  const save = async () => {
    if (!projectId || !source || !draft || !canEdit) return;
    setIsLoading(true);
    setError(null);
    try {
      const saved = await quizzesApi.update(projectId, applyDraftToQuiz(source, draft));
      setSource(saved);
      setDraft(createDraftFromQuiz(saved));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить викторину.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedProject) return <Alert severity="warning">Выберите проект, чтобы открыть викторину.</Alert>;
  if (isLoading && !draft) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  if (error && !draft) return <Alert severity="error">{error}</Alert>;
  if (!source || !draft) return <Alert severity="warning">Викторина не найдена.</Alert>;
  const hostName = user?.projectProfiles.find((profile) => profile.projectId === selectedProject.id)?.nickname ?? user?.displayName ?? "";

  return (
    <Stack spacing={3}>
      <GamePageHeader
        breadcrumbPath="/quizzes"
        breadcrumbItems={[{ label: draft.name || "Без названия" }]}
        title={draft.name || "Без названия"}
        description="Подготовьте вопросы и проверьте готовность викторины к проведению."
        chips={[
          { label: `Проект: ${selectedProject.name}` },
          { label: `Конфиг: ${draft.configName}`, color: "secondary" },
          { label: source.status === "ready" ? "Готова" : "Черновик", color: source.status === "ready" ? "success" : "warning" },
          ...(isDirty ? [{ label: "Есть изменения", color: "warning" as const }] : []),
        ]}
        actions={canEdit ? [
          { key: "save", label: "Сохранить", icon: <SaveRoundedIcon />, onClick: () => void save(), disabled: !isDirty || isLoading, loading: isLoading, variant: "contained" as const },
          { key: "reset", label: "Сбросить", icon: <RefreshRoundedIcon />, onClick: () => setDraft(createDraftFromQuiz(source)), disabled: !isDirty || isLoading, variant: "text" as const, color: "inherit" as const },
        ] : []}
      />
      {!canEdit ? <Alert severity="info">Эта викторина доступна только для просмотра.</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", lg: 360 }, flexShrink: 0 }}><QuizQuestionNav questions={draft.questions} activeSection={activeSection} editable={canEdit} onSelect={setActiveSection} onReorder={(sourceId, targetId) => setDraft({ ...draft, questions: reorderQuestions(draft.questions, sourceId, targetId) })} /></Stack>
        <Stack sx={{ flex: 1, minWidth: 0, width: "100%" }}><QuizEditorWorkspace draft={draft} quiz={source} activeSection={activeSection} editable={canEdit} hostName={hostName} onChange={setDraft} /></Stack>
      </Stack>
    </Stack>
  );
}
