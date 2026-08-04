import { useEffect, useState } from "react";
import { Alert, Card, CardContent, Stack, Typography } from "@mui/material";
import AppConfirmDialog from "../../../../components/ui/AppConfirmDialog";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppTextInput from "../../../../components/ui/AppTextInput";
import type { QuizChatMutationResult, QuizEventQuestion } from "../types";

interface Props { question: QuizEventQuestion; busy: boolean; editable: boolean; onSave: (questionId: string, rawText: string) => Promise<QuizChatMutationResult | null>; }

export default function QuizChatControls({ question, busy, editable, onSave }: Props) {
  const [rawText, setRawText] = useState(question.chat.rawText);
  const [confirmClear, setConfirmClear] = useState(false);
  const [result, setResult] = useState<QuizChatMutationResult["mutation"] | null>(null);
  useEffect(() => setRawText(question.chat.rawText), [question.chat.rawText, question.id]);
  const save = async () => { const response = await onSave(question.id, rawText); if (response) setResult(response.mutation); };
  const requestSave = () => !rawText.trim() && question.playerGroups.length > 0 ? setConfirmClear(true) : void save();
  if (!editable) return null;
  return <><Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Чат</Typography><Typography variant="body2" color="text.secondary">Сохраните полную текущую версию чата. Backend разберёт её и обновит доступные ответы.</Typography><AppTextInput multiline minRows={7} label="Текст чата" value={rawText} disabled={busy} onChange={(event) => setRawText(event.target.value)} /><AppPillButton disabled={busy || rawText === question.chat.rawText} onClick={requestSave}>Сохранить чат</AppPillButton>{result ? <Alert severity={result.effectiveChange ? "success" : "info"}>Кандидатов: {result.candidateMessagesCount}; дубликатов: {result.duplicateMessagesCount}.</Alert> : null}</Stack></CardContent></Card><AppConfirmDialog open={confirmClear} title="Очистить сохранённый чат?" description="Будут удалены сообщения и сохранённый результат вопроса. Факт проведения сохранится." confirmLabel="Очистить" cancelLabel="Отмена" confirmColor="error" loading={busy} onClose={() => setConfirmClear(false)} onConfirm={() => { setConfirmClear(false); void save(); }} /></>;
}
