import { useState } from "react";
import { Alert, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import AppConfirmDialog from "../../../../components/ui/AppConfirmDialog";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppTextInput from "../../../../components/ui/AppTextInput";
import type { QuizChatMutationResult, QuizEventQuestion } from "../types";

interface QuizChatControlsProps {
  question: QuizEventQuestion;
  busy: boolean;
  editable: boolean;
  onAppend: (questionId: string, rawText: string) => Promise<QuizChatMutationResult | null>;
  onReplace: (questionId: string, rawText: string) => Promise<QuizChatMutationResult | null>;
  onClear: (questionId: string) => Promise<QuizChatMutationResult | null>;
}

export default function QuizChatControls({ question, busy, editable, onAppend, onReplace, onClear }: QuizChatControlsProps) {
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<QuizChatMutationResult["mutation"] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const submit = async (mode: "append" | "replace") => {
    const mutation = mode === "append"
      ? await onAppend(question.id, rawText)
      : await onReplace(question.id, rawText);
    if (mutation) {
      setResult(mutation.mutation);
      setRawText("");
    }
  };
  const clear = async () => {
    setConfirmClear(false);
    const mutation = await onClear(question.id);
    if (mutation) setResult(mutation.mutation);
  };

  if (!editable) return null;
  return <><Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Чат вопроса</Typography><Typography variant="body2" color="text.secondary">Добавьте новый фрагмент или замените весь effective chat. Выбор ответов никогда не сохраняется автоматически.</Typography><AppTextInput multiline minRows={5} label="Текст чата" value={rawText} disabled={busy} onChange={(event) => setRawText(event.target.value)} /><Stack direction={{ xs: "column", sm: "row" }} spacing={1}><AppPillButton disabled={busy || !rawText.trim()} onClick={() => void submit("append")}>Добавить чат</AppPillButton><AppPillButton disabled={busy || !rawText.trim()} variant="outlined" onClick={() => void submit("replace")}>Заменить чат</AppPillButton><AppPillButton disabled={busy || (!question.playerGroups.length && !question.chatFragments.length)} color="error" variant="outlined" onClick={() => setConfirmClear(true)}>Очистить чат</AppPillButton></Stack>{result ? <Alert severity={result.effectiveChange ? "success" : "info"}>Кандидатов: {result.candidateMessagesCount}; добавлено: {result.addedMessagesCount}; удалено: {result.removedMessagesCount}; дубликатов: {result.duplicateMessagesCount}.</Alert> : null}<Divider /><Typography variant="caption" color="text.secondary">Сохранённых импортов: {question.chatFragments.length} · текущих групп игроков: {question.playerGroups.length}</Typography></Stack></CardContent></Card><AppConfirmDialog open={confirmClear} title="Очистить чат вопроса?" description="Будут удалены effective сообщения и сохранённые выборы ответов для этого вопроса. Проверка и награды будут сброшены." confirmLabel="Очистить" cancelLabel="Отмена" confirmColor="error" loading={busy} onClose={() => setConfirmClear(false)} onConfirm={() => void clear()} /></>;
}
