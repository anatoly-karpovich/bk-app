import { Alert, Box, Card, CardContent, Checkbox, Radio, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import type { QuizAnswerSelectionDraft, QuizEventQuestion, QuizPlayerMessageGroup } from "../types";

interface QuizAnswerSelectionEditorProps {
  question: QuizEventQuestion;
  draft: QuizAnswerSelectionDraft | undefined;
  dirty: boolean;
  editable: boolean;
  busy: boolean;
  onPlayerSelected: (playerName: string, isSelected: boolean) => void;
  onPlayerSelectedMessage: (playerName: string, selectedMessageId: string) => void;
  onSave: () => void;
}

function PlayerAnswerGroup({
  group,
  choice,
  editable,
  busy,
  onSelected,
  onSelectedMessage,
}: {
  group: QuizPlayerMessageGroup;
  choice: QuizAnswerSelectionDraft[string] | undefined;
  editable: boolean;
  busy: boolean;
  onSelected: (isSelected: boolean) => void;
  onSelectedMessage: (selectedMessageId: string) => void;
}) {
  const selectedMessageId = choice?.selectedMessageId ?? group.selectedMessageId ?? group.messages[0]?.id ?? null;
  const isSelected = choice?.isSelected ?? group.selectedMessageId !== null;
  return <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 1.25, py: 1, opacity: isSelected ? 1 : 0.72 }}><Stack spacing={0.5}><Stack direction="row" alignItems="center" spacing={0.5}><Checkbox size="small" disabled={!editable || busy} checked={isSelected} onChange={(event) => onSelected(event.target.checked)} /><Typography fontWeight={700}>{group.playerName}</Typography></Stack>{group.messages.map((message) => <Stack key={message.id} direction="row" spacing={0.5} alignItems="flex-start"><Radio size="small" disabled={!editable || busy} checked={selectedMessageId === message.id} onChange={() => onSelectedMessage(message.id)} /><Stack sx={{ pt: 0.75, minWidth: 0 }}><Typography variant="caption" color="text.secondary">{message.timestamp ?? "без времени"} · {message.transport}</Typography><Typography sx={{ overflowWrap: "anywhere" }}>{message.text}</Typography></Stack></Stack>)}</Stack></Box>;
}

export default function QuizAnswerSelectionEditor({ question, draft, dirty, editable, busy, onPlayerSelected, onPlayerSelectedMessage, onSave }: QuizAnswerSelectionEditorProps) {
  const selectedPlayersCount = question.playerGroups.filter((group) =>
    draft?.[group.playerName]?.isSelected ?? group.selectedMessageId !== null,
  ).length;
  const allPlayersSelected = question.playerGroups.length > 0 && selectedPlayersCount === question.playerGroups.length;
  const setAllPlayersSelected = () => {
    question.playerGroups.forEach((group) => onPlayerSelected(group.playerName, !allPlayersSelected));
  };

  return <Card><CardContent><Stack spacing={1.25}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }}><Stack><Typography variant="h5">Выбор ответов</Typography><Typography variant="body2" color="text.secondary">Отметьте игроков, которых нужно включить в рейтинг, и выберите по одному сообщению для каждого.</Typography></Stack>{editable ? <AppPillButton disabled={busy || !dirty} onClick={onSave}>Сохранить выбор</AppPillButton> : null}</Stack>{question.playerGroups.length ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}><AppPillButton size="small" variant="outlined" disabled={!editable || busy} onClick={setAllPlayersSelected}>{allPlayersSelected ? "Исключить всех" : "Учитывать всех"}</AppPillButton><Typography variant="body2" color="text.secondary">Выбрано: {selectedPlayersCount} из {question.playerGroups.length}</Typography></Stack> : null}{dirty ? <Alert severity="info">Есть несохранённые изменения выбора ответов.</Alert> : null}{question.playerGroups.length ? question.playerGroups.map((group) => <PlayerAnswerGroup key={group.playerName} group={group} choice={draft?.[group.playerName]} editable={editable} busy={busy} onSelected={(isSelected) => onPlayerSelected(group.playerName, isSelected)} onSelectedMessage={(selectedMessageId) => onPlayerSelectedMessage(group.playerName, selectedMessageId)} />) : <Alert severity="info">Пока нет распознанных кандидатов.</Alert>}</Stack></CardContent></Card>;
}
