import { useState } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Alert, Card, CardContent, Checkbox, Chip, Divider, Radio, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppSelectableListItem from "../../../../components/ui/AppSelectableListItem";
import AppTextInput from "../../../../components/ui/AppTextInput";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import type { QuizAnswerSelectionDraft, QuizChatMutationResult, QuizEvent, QuizEventQuestion, QuizPlayerMessageGroup } from "../types";

interface Props {
  event: QuizEvent;
  selectedQuestionId: string;
  selectionDrafts: Record<string, QuizAnswerSelectionDraft>;
  isSelectionDraftDirty: (questionId: string) => boolean;
  busy: boolean;
  editable: boolean;
  onSelectQuestion: (id: string) => void;
  onPlayerSelected: (questionId: string, playerName: string, isSelected: boolean) => void;
  onPlayerSelectedMessage: (questionId: string, playerName: string, selectedMessageId: string) => void;
  onSaveSelections: (questionId: string) => void;
  onAppendChat: (questionId: string, rawText: string) => Promise<QuizChatMutationResult | null>;
  onReview: (questionId: string) => void;
  onUnreview: (questionId: string) => void;
  onMarkAsNotConducted: (questionId: string) => void;
  onRequestComplete: () => void;
  onReopen: () => void;
  onRequestDelete: () => void;
}

const copy = (text: string) => void navigator.clipboard?.writeText(text);
const shortText = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 44) || "Без текста";

function questionState(question: QuizEventQuestion): string {
  if (question.reviewedAt !== null) return `Проверен · проведён #${question.conductedOrder}`;
  if (question.conductedOrder !== null) return `Проведён #${question.conductedOrder} · требует проверки`;
  return "Ещё не проведён";
}

function MessagePreview({ label, text }: { label: string; text: string }) {
  return <Card variant="outlined"><CardContent><Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start"><Stack spacing={0.5} sx={{ minWidth: 0 }}><Typography variant="overline" color="text.secondary">{label}</Typography><Typography component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", overflowWrap: "anywhere" }}>{text}</Typography></Stack><AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(text)}>Копировать</AppPillButton></Stack></CardContent></Card>;
}

function PlayerAnswerGroup({
  group,
  draft,
  editable,
  busy,
  onSelected,
  onSelectedMessage,
}: {
  group: QuizPlayerMessageGroup;
  draft: QuizAnswerSelectionDraft[string] | undefined;
  editable: boolean;
  busy: boolean;
  onSelected: (isSelected: boolean) => void;
  onSelectedMessage: (selectedMessageId: string) => void;
}) {
  const selectedMessageId = draft?.selectedMessageId ?? group.selectedMessageId ?? group.messages[0]?.id ?? null;
  const isSelected = draft?.isSelected ?? group.selectedMessageId !== null;
  return <Card variant="outlined"><CardContent><Stack spacing={1}><Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" alignItems="center" spacing={0.5}><Checkbox size="small" disabled={!editable || busy} checked={isSelected} onChange={(event) => onSelected(event.target.checked)} /><Typography fontWeight={700}>{group.playerName}</Typography></Stack><Chip size="small" label={isSelected ? "Участвует" : "Исключён"} color={isSelected ? "success" : "default"} /></Stack>{group.messages.map((message) => <Stack key={message.id} direction="row" spacing={0.5} alignItems="flex-start"><Radio size="small" disabled={!editable || busy || !isSelected} checked={selectedMessageId === message.id} onChange={() => onSelectedMessage(message.id)} /><Stack sx={{ pt: 0.75, minWidth: 0 }}><Typography variant="caption" color="text.secondary">{message.timestamp ?? "без времени"} · {message.transport}</Typography><Typography sx={{ overflowWrap: "anywhere" }}>{message.text}</Typography></Stack></Stack>)}</Stack></CardContent></Card>;
}

export default function QuizEventWorkspace({ event, selectedQuestionId, selectionDrafts, isSelectionDraftDirty, busy, editable, onSelectQuestion, onPlayerSelected, onPlayerSelectedMessage, onSaveSelections, onAppendChat, onReview, onUnreview, onMarkAsNotConducted, onRequestComplete, onReopen, onRequestDelete }: Props) {
  const question = event.questions.find((item) => item.id === selectedQuestionId) ?? event.questions[0] ?? null;
  const [chatText, setChatText] = useState("");
  const [importResult, setImportResult] = useState<QuizChatMutationResult["mutation"] | null>(null);
  const summaryText = event.summary?.players.map((player) => `${player.playerName} — ${formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "без награды"}`).join("\n") ?? "";
  const canMutate = editable && event.status === "open";
  if (!question) return <Alert severity="info">В проведении нет вопросов.</Alert>;

  const appendChat = async () => {
    const result = await onAppendChat(question.id, chatText);
    if (result) {
      setImportResult(result.mutation);
      setChatText("");
    }
  };

  return <Stack spacing={2.25}>
    <Card><CardContent><Stack spacing={1.5}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}><Stack><Typography variant="h5">{event.name}</Typography><Typography variant="body2" color="text.secondary">Ведущий: {event.hostSnapshot.nickname} · создано {new Date(event.createdAt).toLocaleString("ru-RU")}</Typography></Stack><Chip label={event.status === "completed" ? "Завершено" : "Открыто"} color={event.status === "completed" ? "success" : "info"} /></Stack>{editable ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>{event.status === "open" ? <AppPillButton disabled={busy} variant="outlined" onClick={onRequestComplete}>Завершить проведение</AppPillButton> : <AppPillButton disabled={busy} onClick={onReopen}>Открыть для редактирования</AppPillButton>}{canMutate ? <AppPillButton disabled={busy} variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={onRequestDelete}>Удалить</AppPillButton> : null}</Stack> : null}</Stack></CardContent></Card>
    <Stack direction={{ xs: "column", lg: "row" }} spacing={2.25} alignItems="flex-start"><Card sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0 }}><CardContent><Stack spacing={1}><Typography variant="h5">Вопросы</Typography>{event.questions.map((item) => <AppSelectableListItem key={item.id} primaryText={`Вопрос ${item.questionIndex}`} secondaryText={`${questionState(item)} · ${shortText(item.questionText)}`} icon={<CheckCircleRoundedIcon fontSize="small" />} selected={item.id === question.id} onClick={() => onSelectQuestion(item.id)} trailing={<Chip size="small" label={item.ranking.length} />} />)}</Stack></CardContent></Card>
      <Stack spacing={2.25} sx={{ flex: 1, minWidth: 0 }}><Card><CardContent><Stack spacing={1.5}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }}><Typography variant="h5">Вопрос {question.questionIndex}</Typography><Chip label={questionState(question)} /></Stack>{canMutate ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>{question.reviewedAt === null ? <AppPillButton disabled={busy} onClick={() => onReview(question.id)}>Проверить результат</AppPillButton> : <AppPillButton disabled={busy} variant="outlined" onClick={() => onUnreview(question.id)}>Сбросить проверку</AppPillButton>}{question.conductedOrder !== null ? <AppPillButton disabled={busy} variant="outlined" color="warning" onClick={() => onMarkAsNotConducted(question.id)}>Считать непроведённым</AppPillButton> : null}</Stack> : null}<Divider /><MessagePreview label="Сообщение с вопросом" text={question.generatedMessage} /><MessagePreview label="Сообщение с правильным ответом" text={question.generatedAnswerMessage} /></Stack></CardContent></Card>
        {canMutate ? <Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Добавить чат</Typography><Typography variant="body2" color="text.secondary">Новые сообщения дополняют effective chat; дубликаты не влияют на проверенный результат.</Typography><AppTextInput multiline minRows={5} label="Фрагмент чата" value={chatText} disabled={busy} onChange={(inputEvent) => setChatText(inputEvent.target.value)} /><AppPillButton disabled={busy || !chatText.trim()} onClick={() => void appendChat()} sx={{ alignSelf: "flex-start" }}>Добавить</AppPillButton>{importResult ? <Alert severity="success">Кандидатов: {importResult.candidateMessagesCount}; добавлено: {importResult.addedMessagesCount}; дубликатов: {importResult.duplicateMessagesCount}.</Alert> : null}</Stack></CardContent></Card> : null}
        <Card><CardContent><Stack spacing={1.25}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }}><Typography variant="h5">Ответы игроков</Typography>{canMutate ? <AppPillButton disabled={busy || !isSelectionDraftDirty(question.id)} onClick={() => onSaveSelections(question.id)}>Сохранить выбор</AppPillButton> : null}</Stack>{question.playerGroups.length ? question.playerGroups.map((group) => <PlayerAnswerGroup key={group.playerName} group={group} draft={selectionDrafts[question.id]?.[group.playerName]} editable={canMutate} busy={busy} onSelected={(isSelected) => onPlayerSelected(question.id, group.playerName, isSelected)} onSelectedMessage={(selectedMessageId) => onPlayerSelectedMessage(question.id, group.playerName, selectedMessageId)} />) : <Alert severity="info">Пока нет распознанных кандидатов.</Alert>}</Stack></CardContent></Card>
        {question.ranking.length ? <Card><CardContent><Stack spacing={1}><Typography variant="h5">Порядок выбранных ответов</Typography>{question.ranking.map((answer) => <Typography key={answer.selectedMessageId}>{answer.position}. {answer.playerName} · {answer.timestamp ?? "без времени"}</Typography>)}</Stack></CardContent></Card> : null}
        {event.summary ? <Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Итоги</Typography><Typography variant="body2" color="text.secondary">Проведено: {event.summary.totalConductedQuestions} из {event.summary.totalPreparedQuestions}. Проверено: {event.summary.totalReviewedQuestions}.</Typography><Table size="small"><TableHead><TableRow><TableCell>Игрок</TableCell><TableCell align="right">Верных</TableCell><TableCell>Обычные</TableCell><TableCell>Бонусы</TableCell><TableCell>Итого</TableCell></TableRow></TableHead><TableBody>{event.summary.players.map((player) => <TableRow key={player.playerName}><TableCell>{player.playerName}</TableCell><TableCell align="right">{player.correctAnswers}</TableCell><TableCell>{formatResourceAmounts(player.regularRewards, event.quizSnapshot.resources) || "—"}</TableCell><TableCell>{formatResourceAmounts(player.bonusRewards, event.quizSnapshot.resources) || "—"}</TableCell><TableCell>{formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "—"}</TableCell></TableRow>)}</TableBody></Table><AppTextInput multiline minRows={5} label="Для администрации" value={summaryText} InputProps={{ readOnly: true }} /><AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(summaryText)} sx={{ alignSelf: "flex-start" }}>Копировать ведомость</AppPillButton></Stack></CardContent></Card> : null}
      </Stack></Stack>
  </Stack>;
}
