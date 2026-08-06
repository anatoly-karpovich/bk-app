import { useEffect, useMemo, useState } from "react";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, CircularProgress, LinearProgress, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../../components/GamePageHeader";
import AppConfirmDialog from "../../../components/ui/AppConfirmDialog";
import { useAuth } from "../../auth/useAuth";
import { quizConfigsApi } from "../../configs/api/quizConfigs.client";
import type { Project } from "../../projects/types";
import { quizzesApi } from "./api/quizzes.client";
import QuizCreateStartState from "./components/QuizCreateStartState";
import QuizEditorWorkspace from "./components/QuizEditorWorkspace";
import QuizQuestionNav, { type QuizEditorSection } from "./components/QuizQuestionNav";
import QuizSaveBar from "./components/QuizSaveBar";
import { createQuizDraft, isQuestionComplete, reorderQuestions, toCreateQuizInput, type QuizDraft } from "./quizEditor.helpers";
import type { QuizConfig } from "./types";

interface QuizCreatePageProps {
  selectedProject: Project | null;
}

function DraftProgress({ ready, total }: { ready: number; total: number }) {
  const value = total ? Math.round((ready / total) * 100) : 0;
  return (
    <Box sx={{ width: "min(460px, 100%)", pt: 0.25 }}>
      <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
        <Typography variant="caption" fontWeight={800}>{ready} из {total} вопросов готовы</Typography>
        <Typography variant="caption" fontWeight={800}>{value}%</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={value} sx={{ height: 8, borderRadius: 99, bgcolor: "rgba(255, 255, 255, 0.75)", "& .MuiLinearProgress-bar": { borderRadius: 99 } }} />
    </Box>
  );
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
  const readyCount = useMemo(() => draft?.questions.filter(isQuestionComplete).length ?? 0, [draft]);

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
    setDraft({ ...nextDraft, name: `Новая викторина — ${selectedConfig.name}` });
    setActiveSection("general");
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
    <Stack spacing={2.75}>
      <GamePageHeader
        breadcrumbPath="/quizzes"
        breadcrumbItems={[{ label: "Создание" }]}
        title="Новая викторина"
        description="Выберите готовый конфиг, заполните вопросы и сохраните подготовленную викторину."
        chips={[
          { label: `Проект: ${selectedProject.name}` },
          ...(selectedConfig ? [{ label: `Конфиг: ${selectedConfig.name}`, color: "secondary" as const }] : []),
          { label: "Черновик", color: "warning" },
        ]}
        footer={draft ? <DraftProgress ready={readyCount} total={draft.questions.length} /> : null}
        actions={draft ? [{ key: "save", label: "Сохранить", icon: <SaveRoundedIcon />, onClick: () => void save(), loading: isLoading, variant: "contained" as const }] : []}
        cardSx={{ position: "relative", overflow: "hidden", "& .MuiCardContent-root": { position: "relative", zIndex: 1 }, "&::after": { content: '""', position: "absolute", right: -120, bottom: -170, width: 420, height: 420, borderRadius: "50%", bgcolor: "rgba(104, 124, 255, 0.08)" } }}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {isLoading && !configs.length ? <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack> : null}
      {!isLoading && !configs.length ? <Alert severity="info">Нет готовых конфигов. Сначала создайте и настройте конфиг викторины.</Alert> : null}
      {selectedConfig && !draft ? <QuizCreateStartState configs={configs} selectedConfigId={selectedConfigId} disabled={isLoading} onConfigChange={changeConfig} onStart={start} /> : null}
      {draft ? (
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="flex-start">
          <Box sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0 }}><QuizQuestionNav questions={draft.questions} activeSection={activeSection} editable onSelect={setActiveSection} onReorder={(sourceId, targetId) => setDraft({ ...draft, questions: reorderQuestions(draft.questions, sourceId, targetId) })} /></Box>
          <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            <QuizEditorWorkspace draft={draft} config={selectedConfig} resources={selectedProject.resources} activeSection={activeSection} editable hostName={hostName} onChange={setDraft} />
            <QuizSaveBar dirty loading={isLoading} onSave={() => void save()} />
          </Stack>
        </Stack>
      ) : null}
      {pendingConfigId ? <AppConfirmDialog open title="Сменить конфиг?" description="Локальный черновик и заполненные вопросы будут потеряны." confirmLabel="Сменить" cancelLabel="Отмена" confirmColor="warning" onClose={() => setPendingConfigId(null)} onConfirm={() => applyConfig(pendingConfigId)} /> : null}
    </Stack>
  );
}
