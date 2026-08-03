import { useEffect, useState } from "react";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, CircularProgress, FormControl, InputLabel, MenuItem, Select, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../../components/GamePageHeader";
import AppConfirmDialog from "../../../components/ui/AppConfirmDialog";
import { useAuth } from "../../auth/useAuth";
import { quizConfigsApi } from "../../configs/api/quizConfigs.client";
import type { Project } from "../../projects/types";
import { quizzesApi } from "./api/quizzes.client";
import QuizEditorWorkspace from "./components/QuizEditorWorkspace";
import QuizQuestionNav, { type QuizEditorSection } from "./components/QuizQuestionNav";
import { createQuizDraft, reorderQuestions, toCreateQuizInput, type QuizDraft } from "./quizEditor.helpers";
import type { QuizConfig } from "./types";

interface QuizCreatePageProps {
  selectedProject: Project | null;
}

export default function QuizCreatePage({ selectedProject }: QuizCreatePageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [configs, setConfigs] = useState<QuizConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [activeSection, setActiveSection] = useState<QuizEditorSection>("general");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfigId, setPendingConfigId] = useState<string | null>(null);
  const projectId = selectedProject?.id;
  const selectedConfig = configs.find((config) => config.id === selectedConfigId) ?? null;

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const readyConfigs = (await quizConfigsApi.list(projectId)).filter((config) => config.status === "ready");
        setConfigs(readyConfigs);
        setSelectedConfigId((current) => readyConfigs.some((config) => config.id === current) ? current : (readyConfigs[0]?.id ?? ""));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить конфиги викторин.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [projectId]);

  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft]);

  const applyConfig = (configId: string) => {
    setSelectedConfigId(configId);
    setDraft(null);
    setActiveSection("general");
    setPendingConfigId(null);
  };
  const changeConfig = (configId: string) => {
    if (configId === selectedConfigId) return;
    if (draft) setPendingConfigId(configId);
    else applyConfig(configId);
  };
  const start = () => {
    if (!selectedConfig) return;
    const nextDraft = createQuizDraft(selectedConfig);
    setDraft(nextDraft);
    setActiveSection(nextDraft.questions[0]?.id ?? "general");
  };
  const save = async () => {
    if (!projectId || !draft) return;
    setIsLoading(true);
    setError(null);
    try {
      const quiz = await quizzesApi.create(projectId, toCreateQuizInput(draft));
      navigate(`/quizzes/${encodeURIComponent(quiz.id)}/edit`, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать викторину.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedProject) return <Alert severity="warning">Выберите проект, чтобы создать викторину.</Alert>;
  const hostName = user?.projectProfiles.find((profile) => profile.projectId === selectedProject.id)?.nickname ?? user?.displayName ?? "";

  return (
    <Stack spacing={3}>
      <GamePageHeader
        breadcrumbPath="/quizzes"
        breadcrumbItems={[{ label: "Создание" }]}
        title="Новая викторина"
        description="Выберите готовый конфиг, заполните вопросы и сохраните подготовленную викторину."
        chips={[{ label: `Проект: ${selectedProject.name}` }, ...(draft ? [{ label: `Конфиг: ${draft.configName}`, color: "secondary" as const }] : [])]}
        actions={draft ? [{ key: "save", label: "Сохранить", icon: <SaveRoundedIcon />, onClick: () => void save(), loading: isLoading, variant: "contained" as const }] : []}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {isLoading && !configs.length ? <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack> : null}
      {!isLoading && !configs.length ? <Alert severity="info">Нет готовых конфигов. Сначала создайте и настройте конфиг викторины.</Alert> : null}
      {draft ? (
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="flex-start">
          <Stack sx={{ width: { xs: "100%", lg: 360 }, flexShrink: 0 }}><QuizQuestionNav questions={draft.questions} activeSection={activeSection} editable onSelect={setActiveSection} onReorder={(sourceId, targetId) => setDraft({ ...draft, questions: reorderQuestions(draft.questions, sourceId, targetId) })} /></Stack>
          <Stack sx={{ flex: 1, minWidth: 0, width: "100%" }}><QuizEditorWorkspace draft={draft} activeSection={activeSection} editable hostName={hostName} onChange={setDraft} /></Stack>
        </Stack>
      ) : null}
      {selectedConfig && !draft ? (
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="flex-start">
          <Stack sx={{ width: { xs: "100%", lg: 360 }, flexShrink: 0 }}>
            <QuizQuestionNav
              questions={[]}
              activeSection="general"
              editable={false}
              onSelect={() => undefined}
              onReorder={() => undefined}
              configControl={
                <FormControl fullWidth size="small">
                  <InputLabel id="quiz-config-label">Конфиг</InputLabel>
                  <Select labelId="quiz-config-label" label="Конфиг" value={selectedConfigId} onChange={(event) => changeConfig(event.target.value)} disabled={isLoading || !configs.length}>
                    {configs.map((config) => <MenuItem key={config.id} value={config.id}>{config.name || "Без названия"}</MenuItem>)}
                  </Select>
                </FormControl>
              }
              startAction={{ label: "Начать", onClick: start }}
            />
          </Stack>
          <Alert severity="info" sx={{ flex: 1, width: "100%" }}>Выберите «Начать», чтобы подготовить локальный черновик по конфигу «{selectedConfig.name}».</Alert>
        </Stack>
      ) : null}
      {pendingConfigId ? <AppConfirmDialog open title="Сменить конфиг?" description="Локальный черновик и заполненные вопросы будут потеряны." confirmLabel="Сменить" cancelLabel="Отмена" confirmColor="warning" onClose={() => setPendingConfigId(null)} onConfirm={() => applyConfig(pendingConfigId)} /> : null}
    </Stack>
  );
}
