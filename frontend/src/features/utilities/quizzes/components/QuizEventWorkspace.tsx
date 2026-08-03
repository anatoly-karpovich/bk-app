import { useEffect, useMemo, useState } from "react";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import { Alert, Button, Card, CardContent, Chip, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppTextInput from "../../../../components/ui/AppTextInput";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import type { QuizAnswerStatus, QuizEvent, QuizMessageKind } from "../types";

interface Props {
  event: QuizEvent;
  selectedQuestionId: string;
  busy: boolean;
  onSelectQuestion: (id: string) => void;
  onEventAction: (action: string) => void;
  onQuestionAction: (id: string, action: string) => void;
  onReorder: (ids: string[]) => void;
  onSetMessage: (questionId: string, kind: QuizMessageKind, text: string | null) => void;
  onClearMessage: (questionId: string, kind: QuizMessageKind) => void;
  onImport: (questionId: string, mode: "append" | "replace", text: string) => void;
  onStatus: (questionId: string, answerId: string, status: QuizAnswerStatus) => void;
  onBulkStatus: (questionId: string, answerIds: string[], status: QuizAnswerStatus) => void;
  onDelete: () => void;
}

const copy = (text: string) => void navigator.clipboard?.writeText(text);
const terminal = (status: QuizEvent["status"]) => status === "completed" || status === "cancelled";
const shortText = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 44) || "Без текста";

export default function QuizEventWorkspace({ event, selectedQuestionId, busy, onSelectQuestion, onEventAction, onQuestionAction, onReorder, onSetMessage, onClearMessage, onImport, onStatus, onBulkStatus, onDelete }: Props) {
  const question = event.questions.find((item) => item.id === selectedQuestionId) ?? event.questions.find((item) => item.id === event.currentQuestionId) ?? event.questions[0] ?? null;
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [chatText, setChatText] = useState("");
  useEffect(() => {
    if (!question) return;
    setQuestionText(question.message.messageTextOverride ?? question.generatedMessage);
    setAnswerText(question.message.answerTextOverride ?? question.generatedAnswerMessage);
  }, [question?.id, question?.message.messageTextOverride, question?.message.answerTextOverride, question?.generatedMessage, question?.generatedAnswerMessage]);

  const movable = useMemo(() => event.questions.filter((item) => item.status === "pending" || item.status === "skipped").sort((left, right) => left.questionIndex - right.questionIndex), [event.questions]);
  const summaryText = event.summary?.players.map((player) => `${player.playerName} — ${formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "без награды"}`).join("\n") ?? "";
  const pendingAnswerIds = question?.answers.filter((answer) => answer.status === "pending").map((answer) => answer.id) ?? [];
  const canMutate = !terminal(event.status);
  const canModerate = event.status === "active";

  const move = (offset: number) => {
    if (!question) return;
    const index = movable.findIndex((item) => item.id === question.id);
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= movable.length) return;
    const ids = movable.map((item) => item.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    onReorder(ids);
  };

  if (!question) return null;
  const questionTextChanged = questionText !== (question.message.messageTextOverride ?? question.generatedMessage);
  const answerTextChanged = answerText !== (question.message.answerTextOverride ?? question.generatedAnswerMessage);

  return <Stack spacing={2.25}>
    <Card><CardContent><Stack spacing={1.5}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Stack><Typography variant="h5">{event.name}</Typography><Typography variant="body2" color="text.secondary">Ведущий: {event.hostSnapshot.nickname} · создано {new Date(event.createdAt).toLocaleString("ru-RU")}</Typography></Stack>
        <Chip label={event.status} color={event.status === "completed" ? "success" : event.status === "active" ? "info" : "warning"} />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        {event.status === "draft" ? <AppPillButton disabled={busy} onClick={() => onEventAction("start")}>Начать Event</AppPillButton> : null}
        {event.status === "active" ? <AppPillButton disabled={busy} onClick={() => onEventAction("pause")}>Пауза</AppPillButton> : null}
        {event.status === "paused" ? <AppPillButton disabled={busy} onClick={() => onEventAction("resume")}>Продолжить</AppPillButton> : null}
        {["active", "paused"].includes(event.status) ? <AppPillButton disabled={busy} variant="outlined" onClick={() => onEventAction("complete")}>Завершить Event</AppPillButton> : null}
        {canMutate ? <AppPillButton disabled={busy} variant="outlined" color="error" onClick={() => onEventAction("cancel")}>Отменить</AppPillButton> : null}
        <AppPillButton disabled={busy} variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={onDelete}>Удалить</AppPillButton>
      </Stack>
    </Stack></CardContent></Card>

    <Stack direction={{ xs: "column", md: "row" }} spacing={2.25} alignItems="flex-start">
      <Card sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0 }}><CardContent><Stack spacing={1}>
        <Typography variant="h6">Вопросы</Typography>
        {event.questions.map((item) => {
          const acceptedPlayers = new Set(item.answers.filter((answer) => answer.status === "accepted").map((answer) => answer.playerName)).size;
          const hasBonus = item.awards.some((award) => award.source.kind === "bonus_position");
          return <Button key={item.id} size="small" variant={item.id === question.id ? "contained" : "outlined"} onClick={() => onSelectQuestion(item.id)} sx={{ justifyContent: "space-between", textAlign: "left" }}>
            <Stack sx={{ minWidth: 0 }}><Typography variant="caption">{item.questionIndex}. {item.status}</Typography><Typography variant="body2" noWrap>{item.questionTitle || shortText(item.questionText)}</Typography></Stack>
            <Stack direction="row" spacing={0.5} alignItems="center"><Chip size="small" label={acceptedPlayers} />{hasBonus ? <Chip size="small" color="secondary" label="+" /> : null}</Stack>
          </Button>;
        })}
      </Stack></CardContent></Card>

      <Stack spacing={2.25} sx={{ flex: 1, minWidth: 0 }}>
        <Card><CardContent><Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }}><Typography variant="h5">Вопрос {question.questionIndex}</Typography><Chip label={question.status} /></Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            {event.status === "active" && question.status === "pending" ? <AppPillButton disabled={busy} onClick={() => onQuestionAction(question.id, "start")}>Начать вопрос</AppPillButton> : null}
            {event.status === "active" && question.status === "active" ? <AppPillButton disabled={busy} onClick={() => onQuestionAction(question.id, "complete")}>Завершить вопрос</AppPillButton> : null}
            {event.status === "active" && question.status === "pending" ? <AppPillButton disabled={busy} variant="outlined" onClick={() => onQuestionAction(question.id, "skip")}>Пропустить</AppPillButton> : null}
            {event.status === "active" && question.status === "skipped" ? <AppPillButton disabled={busy} variant="outlined" onClick={() => onQuestionAction(question.id, "restore")}>Вернуть</AppPillButton> : null}
            {event.status === "active" && !event.currentQuestionId && ["pending", "skipped"].includes(question.status) ? <>
              <AppPillButton size="small" variant="outlined" startIcon={<KeyboardArrowUpRoundedIcon />} onClick={() => move(-1)} disabled={busy || movable[0]?.id === question.id}>Выше</AppPillButton>
              <AppPillButton size="small" variant="outlined" startIcon={<KeyboardArrowDownRoundedIcon />} onClick={() => move(1)} disabled={busy || movable[movable.length - 1]?.id === question.id}>Ниже</AppPillButton>
            </> : null}
          </Stack>
          <Divider />
          <Typography variant="subtitle1">Сообщение с вопросом</Typography>
          <AppTextInput multiline minRows={4} value={questionText} disabled={busy || !canMutate} onChange={(event) => setQuestionText(event.target.value)} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(questionText)}>Копировать</AppPillButton>{canMutate ? <AppPillButton size="small" disabled={busy || !questionTextChanged} onClick={() => onSetMessage(question.id, "question", questionText === question.generatedMessage ? null : questionText)}>Сохранить текст</AppPillButton> : null}{canMutate && question.message.messageTextOverride !== null ? <AppPillButton size="small" disabled={busy} variant="outlined" onClick={() => onClearMessage(question.id, "question")}>Вернуть шаблон</AppPillButton> : null}</Stack>
          <Typography variant="subtitle1">Сообщение с правильным ответом</Typography>
          <AppTextInput multiline minRows={3} value={answerText} disabled={busy || !canMutate} onChange={(event) => setAnswerText(event.target.value)} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} disabled={question.status !== "completed"} onClick={() => copy(answerText)}>Копировать ответ</AppPillButton>{canMutate ? <AppPillButton size="small" disabled={busy || !answerTextChanged} onClick={() => onSetMessage(question.id, "answer", answerText === question.generatedAnswerMessage ? null : answerText)}>Сохранить текст</AppPillButton> : null}{canMutate && question.message.answerTextOverride !== null ? <AppPillButton size="small" disabled={busy} variant="outlined" onClick={() => onClearMessage(question.id, "answer")}>Вернуть шаблон</AppPillButton> : null}</Stack>
        </Stack></CardContent></Card>

        {canModerate ? <Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Фрагмент чата</Typography><Typography variant="body2" color="text.secondary">Ответы добавляются в конец порядка. Replace деактивирует старые фрагменты, но сохраняет историю решений.</Typography><AppTextInput multiline minRows={5} label="Вставьте фрагмент чата" value={chatText} disabled={busy} onChange={(event) => setChatText(event.target.value)} /><Stack direction={{ xs: "column", sm: "row" }} spacing={1}><AppPillButton disabled={busy || !chatText.trim()} onClick={() => { onImport(question.id, "append", chatText); setChatText(""); }}>Добавить фрагмент</AppPillButton><AppPillButton variant="outlined" disabled={busy || !chatText.trim()} onClick={() => { onImport(question.id, "replace", chatText); setChatText(""); }}>Заменить фрагменты</AppPillButton></Stack>{question.chatFragments.length ? <Typography variant="caption" color="text.secondary">Фрагментов: {question.chatFragments.length}, активных: {question.chatFragments.filter((fragment) => fragment.isActive).length}</Typography> : null}</Stack></CardContent></Card> : null}

        <Card><CardContent><Stack spacing={1.25}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}><Typography variant="h5">Кандидаты на ответ</Typography>{canModerate && pendingAnswerIds.length ? <Stack direction="row" spacing={1}><AppPillButton size="small" disabled={busy} onClick={() => onBulkStatus(question.id, pendingAnswerIds, "accepted")}>Принять все ({pendingAnswerIds.length})</AppPillButton><AppPillButton size="small" disabled={busy} variant="outlined" onClick={() => onBulkStatus(question.id, pendingAnswerIds, "rejected")}>Отклонить все</AppPillButton></Stack> : null}</Stack>{question.answers.length ? question.answers.map((answer) => <Card variant="outlined" key={answer.id}><CardContent><Stack spacing={0.75}><Typography>{answer.playerName}: {answer.rawMessage}</Typography><Typography variant="caption">{answer.status}{answer.position ? ` · место ${answer.position}` : ""}{answer.awards.length ? ` · ${formatResourceAmounts(answer.awards.flatMap((award) => award.resolvedRewards), event.quizSnapshot.resources)}` : ""}</Typography>{canModerate ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><AppPillButton size="small" disabled={busy} variant={answer.status === "accepted" ? "contained" : "outlined"} onClick={() => onStatus(question.id, answer.id, "accepted")}>Принять</AppPillButton><AppPillButton size="small" disabled={busy} variant={answer.status === "rejected" ? "contained" : "outlined"} onClick={() => onStatus(question.id, answer.id, "rejected")}>Отклонить</AppPillButton><AppPillButton size="small" disabled={busy} variant="outlined" onClick={() => onStatus(question.id, answer.id, "pending")}>В ожидание</AppPillButton></Stack> : null}</Stack></CardContent></Card>) : <Alert severity="info">Пока нет распознанных кандидатов.</Alert>}</Stack></CardContent></Card>

        {event.summary ? <Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Ведомость</Typography><Typography variant="body2" color="text.secondary">Завершено вопросов: {event.summary.completedQuestions} из {event.summary.totalQuestions}. Уникальных верных ответов: {event.summary.totalUniqueCorrectAnswers}.</Typography><Table size="small"><TableHead><TableRow><TableCell>Игрок</TableCell><TableCell align="right">Верных</TableCell><TableCell>Обычные</TableCell><TableCell>Бонусы</TableCell><TableCell>Итого</TableCell></TableRow></TableHead><TableBody>{event.summary.players.map((player) => <TableRow key={player.playerName}><TableCell>{player.playerName}</TableCell><TableCell align="right">{player.correctAnswers}</TableCell><TableCell>{formatResourceAmounts(player.regularRewards, event.quizSnapshot.resources) || "—"}</TableCell><TableCell>{formatResourceAmounts(player.bonusRewards, event.quizSnapshot.resources) || "—"}</TableCell><TableCell>{formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "—"}</TableCell></TableRow>)}<TableRow><TableCell colSpan={4}><strong>Всего</strong></TableCell><TableCell><strong>{formatResourceAmounts(event.summary.totalRewards, event.quizSnapshot.resources) || "—"}</strong></TableCell></TableRow></TableBody></Table><AppTextInput multiline minRows={6} label="Для администрации" value={summaryText} InputProps={{ readOnly: true }} /><AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(summaryText)} sx={{ alignSelf: "flex-start" }}>Копировать ведомость</AppPillButton></Stack></CardContent></Card> : null}
      </Stack>
    </Stack>
  </Stack>;
}
