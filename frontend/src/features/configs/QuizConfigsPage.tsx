import { useEffect, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Alert, Button, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import type { Project } from "../projects/types";
import { quizConfigsApi } from "./api/quizConfigs.client";
import type { QuizConfig } from "../utilities/quizzes/types";
import QuizConfigEditor from "./components/QuizConfigEditor";

interface Props { selectedProject: Project | null; }

export default function QuizConfigsPage({ selectedProject }: Props) {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<QuizConfig[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<QuizConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<QuizConfig | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projectId = selectedProject?.id ?? "";

  const load = async (preferredId?: string) => {
    if (!projectId) return;
    setIsBusy(true); setError(null);
    try {
      const nextConfigs = await quizConfigsApi.list(projectId);
      const nextSelectedId = preferredId && nextConfigs.some((config) => config.id === preferredId) ? preferredId : nextConfigs.some((config) => config.id === selectedId) ? selectedId : nextConfigs[0]?.id ?? "";
      const nextSelected = nextConfigs.find((config) => config.id === nextSelectedId) ?? null;
      setConfigs(nextConfigs); setSelectedId(nextSelectedId); setSavedConfig(nextSelected); setDraft(nextSelected ? structuredClone(nextSelected) : null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось загрузить конфиги викторин"); }
    finally { setIsBusy(false); }
  };

  useEffect(() => { void load(); }, [projectId]);
  const isDirty = Boolean(draft && savedConfig && JSON.stringify(draft) !== JSON.stringify(savedConfig));
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  const run = async (action: () => Promise<QuizConfig | void>, preferredId?: string) => {
    setIsBusy(true); setError(null);
    try { const result = await action(); await load(preferredId ?? (result && "id" in result ? result.id : undefined)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить конфиг викторины"); }
    finally { setIsBusy(false); }
  };
  const create = () => void run(() => quizConfigsApi.create(projectId, { name: "", description: "", questionCount: null, defaultRegularRule: null, regularRewardOverrides: [], bonusRules: [], messageTemplates: null, answerMessageTemplates: null }));

  if (!selectedProject) return <Alert severity="info">Выберите проект, чтобы работать с конфигами викторин.</Alert>;
  return <Grid container spacing={3} alignItems="flex-start">
    <Grid item xs={12}><GamePageHeader breadcrumbPath="/configs" title="Конфиги викторин" description="Шаблоны правил, наград и сообщений для подготовленных викторин." actions={[{ key: "refresh", label: "Обновить", onClick: () => void load(), disabled: isBusy }]} /></Grid>
    {error ? <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid> : null}
    <Grid item xs={12} lg={4}><Stack spacing={1}><Button variant="contained" startIcon={<AddRoundedIcon />} disabled={isBusy} onClick={() => { if (!isDirty || window.confirm("Несохранённые изменения будут потеряны. Создать новый конфиг?")) create(); }}>Создать конфиг</Button>{isBusy && !configs.length ? <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack> : null}{configs.map((config) => <Button key={config.id} variant={config.id === selectedId ? "contained" : "outlined"} onClick={() => { if (config.id !== selectedId && isDirty && !window.confirm("Несохранённые изменения будут потеряны. Открыть другой конфиг?")) return; setSelectedId(config.id); setSavedConfig(config); setDraft(structuredClone(config)); }} sx={{ justifyContent: "space-between" }}>{config.name || "Без названия"}<Chip size="small" label={config.status} color={config.status === "ready" ? "success" : "warning"} /></Button>)}</Stack></Grid>
    <Grid item xs={12} lg={8}>{draft ? <QuizConfigEditor config={draft} resources={selectedProject.resources} isBusy={isBusy} isDirty={isDirty} onChange={setDraft} onSave={() => void run(() => quizConfigsApi.update(projectId, draft.id, draft), draft.id)} onReset={() => setDraft(savedConfig ? structuredClone(savedConfig) : null)} onClone={() => void run(() => quizConfigsApi.clone(projectId, draft.id))} onDelete={() => void run(async () => { await quizConfigsApi.delete(projectId, draft.id); }, "")} onCreateQuiz={() => navigate(`/quizzes?configId=${encodeURIComponent(draft.id)}`)} /> : <Card><CardContent><Typography color="text.secondary">Создайте конфиг или выберите существующий.</Typography></CardContent></Card>}</Grid>
  </Grid>;
}
