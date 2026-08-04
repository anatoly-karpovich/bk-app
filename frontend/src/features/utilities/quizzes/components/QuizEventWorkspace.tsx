import { useEffect, useState } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Alert, Card, CardContent, Chip, Divider, Radio, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppSelectableListItem from "../../../../components/ui/AppSelectableListItem";
import AppTextInput from "../../../../components/ui/AppTextInput";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import type { AddQuizChatFragmentResponse, QuizEvent, QuizPlayerAnswerStatus, QuizPlayerMessageGroup } from "../types";

interface Props {
  event: QuizEvent;
  selectedQuestionId: string;
  busy: boolean;
  editable: boolean;
  onSelectQuestion: (id: string) => void;
  onEventAction: (action: "start" | "pause" | "resume") => void;
  onQuestionAction: (id: string, action: "complete") => void;
  onImport: (questionId: string, text: string) => Promise<AddQuizChatFragmentResponse | null>;
  onPlayerAnswer: (questionId: string, input: { playerName: string; status: QuizPlayerAnswerStatus; selectedMessageId: string | null }) => void;
  onRequestComplete: () => void;
  onRequestDelete: () => void;
}

const copy = (text: string) => void navigator.clipboard?.writeText(text);
const terminal = (status: QuizEvent["status"]) => status === "completed" || status === "cancelled";
const shortText = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 44) || "Без текста";
const eventStatusLabel: Record<QuizEvent["status"], string> = { draft: "Черновик", active: "В эфире", paused: "Пауза", completed: "Завершено", cancelled: "Отменено" };
const questionStatusLabel: Record<QuizEvent["questions"][number]["status"], string> = { pending: "Ожидает", active: "В эфире", completed: "Завершён", skipped: "Пропущен" };

function MessagePreview({ label, text }: { label: string; text: string }) {
  return <Card variant="outlined"><CardContent><Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start"><Stack spacing={0.5} sx={{ minWidth: 0 }}><Typography variant="overline" color="text.secondary">{label}</Typography><Typography component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", overflowWrap: "anywhere" }}>{text}</Typography></Stack><AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(text)}>Копировать</AppPillButton></Stack></CardContent></Card>;
}

function PlayerAnswerGroup({ group, editable, busy, onChange }: { group: QuizPlayerMessageGroup; editable: boolean; busy: boolean; onChange: (input: { playerName: string; status: QuizPlayerAnswerStatus; selectedMessageId: string | null }) => void }) {
  const [selectedMessageId, setSelectedMessageId] = useState(group.selectedMessageId);
  useEffect(() => setSelectedMessageId(group.selectedMessageId), [group.selectedMessageId]);
  const selected = group.messages.find((message) => message.id === selectedMessageId) ?? null;
  const accept = () => {
    if (!selected) return;
    onChange({ playerName: group.playerName, status: "accepted", selectedMessageId: selected.id });
  };
  return <Card variant="outlined"><CardContent><Stack spacing={1}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography fontWeight={700}>{group.playerName}</Typography><Chip size="small" label={group.status === "accepted" ? "Принят" : group.status === "rejected" ? "Отклонён" : "Ожидает"} color={group.status === "accepted" ? "success" : group.status === "rejected" ? "default" : "warning"} /></Stack>{group.messages.map((message) => <Stack key={message.id} direction="row" spacing={0.5} alignItems="flex-start"><Radio size="small" disabled={!editable || busy} checked={selectedMessageId === message.id} onChange={() => setSelectedMessageId(message.id)} /><Stack sx={{ pt: 0.75, minWidth: 0 }}><Typography variant="caption" color="text.secondary">{message.timestamp ?? "без времени"} · {message.transport}</Typography><Typography sx={{ overflowWrap: "anywhere" }}>{message.text}</Typography></Stack></Stack>)}{editable ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><AppPillButton size="small" disabled={busy || !selected} variant={group.status === "accepted" ? "contained" : "outlined"} onClick={accept}>Принять</AppPillButton><AppPillButton size="small" disabled={busy} variant={group.status === "rejected" ? "contained" : "outlined"} onClick={() => onChange({ playerName: group.playerName, status: "rejected", selectedMessageId: null })}>Отклонить</AppPillButton><AppPillButton size="small" disabled={busy} variant="outlined" onClick={() => onChange({ playerName: group.playerName, status: "pending", selectedMessageId: null })}>В ожидание</AppPillButton></Stack> : null}</Stack></CardContent></Card>;
}

export default function QuizEventWorkspace({ event, selectedQuestionId, busy, editable, onSelectQuestion, onEventAction, onQuestionAction, onImport, onPlayerAnswer, onRequestComplete, onRequestDelete }: Props) {
  const question = event.questions.find((item) => item.id === selectedQuestionId) ?? event.questions.find((item) => item.id === event.currentQuestionId) ?? event.questions[0] ?? null;
  const [chatText, setChatText] = useState("");
  const [importResult, setImportResult] = useState<AddQuizChatFragmentResponse["importResult"] | null>(null);
  const summaryText = event.summary?.players.map((player) => `${player.playerName} — ${formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "без награды"}`).join("\n") ?? "";
  const canMutate = editable && !terminal(event.status);
  const canReview = editable && ["active", "paused"].includes(event.status) && ["active", "completed"].includes(question?.status ?? "pending");
  if (!question) return <Alert severity="info">В проведении нет вопросов.</Alert>;

  const importChat = async () => {
    const result = await onImport(question.id, chatText);
    if (result) { setImportResult(result.importResult); setChatText(""); }
  };

  return <Stack spacing={2.25}>
    <Card><CardContent><Stack spacing={1.5}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}><Stack><Typography variant="h5">{event.name}</Typography><Typography variant="body2" color="text.secondary">Ведущий: {event.hostSnapshot.nickname} · создано {new Date(event.createdAt).toLocaleString("ru-RU")}</Typography></Stack><Chip label={eventStatusLabel[event.status]} color={event.status === "completed" ? "success" : event.status === "active" ? "info" : "warning"} /></Stack>{editable ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>{event.status === "draft" ? <AppPillButton disabled={busy} startIcon={<PlayArrowRoundedIcon />} onClick={() => onEventAction("start")}>Начать проведение</AppPillButton> : null}{event.status === "active" ? <AppPillButton disabled={busy} startIcon={<PauseRoundedIcon />} onClick={() => onEventAction("pause")}>Пауза</AppPillButton> : null}{event.status === "paused" ? <AppPillButton disabled={busy} startIcon={<PlayArrowRoundedIcon />} onClick={() => onEventAction("resume")}>Продолжить</AppPillButton> : null}{["active", "paused"].includes(event.status) && !event.currentQuestionId && event.questions.every((item) => item.status === "completed" || item.status === "skipped") ? <AppPillButton disabled={busy} variant="outlined" onClick={onRequestComplete}>Завершить проведение</AppPillButton> : null}{canMutate ? <AppPillButton disabled={busy} variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={onRequestDelete}>Удалить</AppPillButton> : null}</Stack> : null}</Stack></CardContent></Card>
    <Stack direction={{ xs: "column", lg: "row" }} spacing={2.25} alignItems="flex-start"><Card sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0 }}><CardContent><Stack spacing={1}><Typography variant="h5">Вопросы</Typography>{event.questions.map((item) => <AppSelectableListItem key={item.id} primaryText={`Вопрос ${item.questionIndex}`} secondaryText={`${questionStatusLabel[item.status]} · ${shortText(item.questionText)}`} icon={<CheckCircleRoundedIcon fontSize="small" />} selected={item.id === question.id} onClick={() => onSelectQuestion(item.id)} trailing={<Chip size="small" label={item.ranking.length} />} />)}</Stack></CardContent></Card>
      <Stack spacing={2.25} sx={{ flex: 1, minWidth: 0 }}><Card><CardContent><Stack spacing={1.5}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }}><Typography variant="h5">Вопрос {question.questionIndex}</Typography><Chip label={questionStatusLabel[question.status]} /></Stack>{editable && event.status === "active" && question.status === "active" ? <AppPillButton disabled={busy} onClick={() => onQuestionAction(question.id, "complete")}>Завершить вопрос</AppPillButton> : null}<Divider /><MessagePreview label="Сообщение с вопросом" text={question.generatedMessage} /><MessagePreview label="Сообщение с правильным ответом" text={question.generatedAnswerMessage} /></Stack></CardContent></Card>
        {canReview ? <Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Импорт чата</Typography><Typography variant="body2" color="text.secondary">Фрагменты добавляются в историю. Совпадающие нормализованные сообщения не создают дубликаты.</Typography><AppTextInput multiline minRows={5} label="Фрагмент чата" value={chatText} disabled={busy} onChange={(inputEvent) => setChatText(inputEvent.target.value)} /><AppPillButton disabled={busy || !chatText.trim()} onClick={() => void importChat()} sx={{ alignSelf: "flex-start" }}>Импортировать</AppPillButton>{importResult ? <Alert severity="success">Распознано: {importResult.parsedMessagesCount}; кандидатов: {importResult.candidateMessagesCount}; добавлено: {importResult.addedMessagesCount}; дубликатов: {importResult.duplicateMessagesCount}.</Alert> : null}</Stack></CardContent></Card> : null}
        <Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Ответы игроков</Typography>{question.playerGroups.length ? question.playerGroups.map((group) => <PlayerAnswerGroup key={group.playerName} group={group} editable={canReview} busy={busy} onChange={(input) => onPlayerAnswer(question.id, input)} />) : <Alert severity="info">Пока нет распознанных кандидатов.</Alert>}</Stack></CardContent></Card>
        {question.ranking.length ? <Card><CardContent><Stack spacing={1}><Typography variant="h5">Порядок принятых ответов</Typography>{question.ranking.map((answer) => <Typography key={answer.selectedMessageId}>{answer.position}. {answer.playerName} · {answer.timestamp ?? "без времени"}</Typography>)}</Stack></CardContent></Card> : null}
        {event.summary ? <Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Промежуточные результаты</Typography><Typography variant="body2" color="text.secondary">Завершено вопросов: {event.summary.completedQuestions} из {event.summary.totalQuestions}. Уникальных верных ответов: {event.summary.totalUniqueCorrectAnswers}.</Typography><Table size="small"><TableHead><TableRow><TableCell>Игрок</TableCell><TableCell align="right">Верных</TableCell><TableCell>Обычные</TableCell><TableCell>Бонусы</TableCell><TableCell>Итого</TableCell></TableRow></TableHead><TableBody>{event.summary.players.map((player) => <TableRow key={player.playerName}><TableCell>{player.playerName}</TableCell><TableCell align="right">{player.correctAnswers}</TableCell><TableCell>{formatResourceAmounts(player.regularRewards, event.quizSnapshot.resources) || "—"}</TableCell><TableCell>{formatResourceAmounts(player.bonusRewards, event.quizSnapshot.resources) || "—"}</TableCell><TableCell>{formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "—"}</TableCell></TableRow>)}</TableBody></Table><AppTextInput multiline minRows={5} label="Для администрации" value={summaryText} InputProps={{ readOnly: true }} /><AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(summaryText)} sx={{ alignSelf: "flex-start" }}>Копировать ведомость</AppPillButton></Stack></CardContent></Card> : null}
      </Stack></Stack>
  </Stack>;
}
