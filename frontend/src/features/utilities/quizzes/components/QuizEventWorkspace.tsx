import { useState } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Alert, Card, CardContent, Checkbox, Chip, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppSelectableListItem from "../../../../components/ui/AppSelectableListItem";
import AppTextInput from "../../../../components/ui/AppTextInput";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import type { QuizAnswerStatus, QuizChatPreviewCandidate, QuizEvent } from "../types";

interface ChatPreview {
  questionId: string;
  candidates: QuizChatPreviewCandidate[];
  selectedKeys: string[];
}

interface Props {
  event: QuizEvent;
  selectedQuestionId: string;
  busy: boolean;
  editable: boolean;
  onSelectQuestion: (id: string) => void;
  onEventAction: (action: "start" | "pause" | "resume") => void;
  onQuestionAction: (id: string, action: "complete") => void;
  onPreview: (questionId: string, text: string) => Promise<QuizChatPreviewCandidate[] | null>;
  onImport: (questionId: string, mode: "append" | "replace", text: string, acceptedCanonicalKeys?: string[]) => void;
  onStatus: (questionId: string, answerId: string, status: QuizAnswerStatus) => void;
  onBulkStatus: (questionId: string, answerIds: string[], status: QuizAnswerStatus) => void;
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

export default function QuizEventWorkspace({ event, selectedQuestionId, busy, editable, onSelectQuestion, onEventAction, onQuestionAction, onPreview, onImport, onStatus, onBulkStatus, onRequestComplete, onRequestDelete }: Props) {
  const question = event.questions.find((item) => item.id === selectedQuestionId) ?? event.questions.find((item) => item.id === event.currentQuestionId) ?? event.questions[0] ?? null;
  const [chatText, setChatText] = useState("");
  const [chatPreview, setChatPreview] = useState<ChatPreview | null>(null);
  const summaryText = event.summary?.players.map((player) => `${player.playerName} — ${formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "без награды"}`).join("\n") ?? "";
  const canMutate = editable && !terminal(event.status);
  const canModerate = editable && event.status === "active";
  const visibleAnswers = question?.answers.filter((answer) => answer.isActive !== false) ?? [];
  const pendingAnswerIds = visibleAnswers.filter((answer) => answer.status === "pending").map((answer) => answer.id);
  const previewForQuestion = chatPreview?.questionId === question?.id ? chatPreview : null;

  if (!question) return <Alert severity="info">В проведении нет вопросов.</Alert>;

  const toggleCandidate = (key: string) => {
    if (!previewForQuestion) return;
    setChatPreview({ ...previewForQuestion, selectedKeys: previewForQuestion.selectedKeys.includes(key) ? previewForQuestion.selectedKeys.filter((candidateKey) => candidateKey !== key) : [...previewForQuestion.selectedKeys, key] });
  };

  const requestPreview = async () => {
    const candidates = await onPreview(question.id, chatText);
    if (!candidates) return;
    setChatPreview({ questionId: question.id, candidates, selectedKeys: candidates.map((candidate) => candidate.canonicalKey) });
  };

  return (
    <Stack spacing={2.25}>
      <Card><CardContent><Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}><Stack><Typography variant="h5">{event.name}</Typography><Typography variant="body2" color="text.secondary">Ведущий: {event.hostSnapshot.nickname} · создано {new Date(event.createdAt).toLocaleString("ru-RU")}</Typography></Stack><Chip label={eventStatusLabel[event.status]} color={event.status === "completed" ? "success" : event.status === "active" ? "info" : "warning"} /></Stack>
        {editable ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          {event.status === "draft" ? <AppPillButton disabled={busy} startIcon={<PlayArrowRoundedIcon />} onClick={() => onEventAction("start")}>Начать проведение</AppPillButton> : null}
          {event.status === "active" ? <AppPillButton disabled={busy} startIcon={<PauseRoundedIcon />} onClick={() => onEventAction("pause")}>Пауза</AppPillButton> : null}
          {event.status === "paused" ? <AppPillButton disabled={busy} startIcon={<PlayArrowRoundedIcon />} onClick={() => onEventAction("resume")}>Продолжить</AppPillButton> : null}
          {["active", "paused"].includes(event.status) && !event.currentQuestionId && event.questions.every((item) => item.status === "completed" || item.status === "skipped") ? <AppPillButton disabled={busy} variant="outlined" onClick={onRequestComplete}>Завершить проведение</AppPillButton> : null}
          {canMutate ? <AppPillButton disabled={busy} variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={onRequestDelete}>Удалить</AppPillButton> : null}
        </Stack> : null}
      </Stack></CardContent></Card>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.25} alignItems="flex-start">
        <Card sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0 }}><CardContent><Stack spacing={1}>
          <Stack spacing={0.25}><Typography variant="h5">Вопросы</Typography><Typography variant="body2" color="text.secondary">Галочка означает, что вопрос завершён.</Typography></Stack>
          {event.questions.map((item) => {
            const acceptedPlayers = new Set(item.answers.filter((answer) => answer.isActive !== false && answer.status === "accepted").map((answer) => answer.playerName)).size;
            return <AppSelectableListItem key={item.id} primaryText={`Вопрос ${item.questionIndex}`} secondaryText={`${questionStatusLabel[item.status]} · ${shortText(item.questionText)}`} icon={<CheckCircleRoundedIcon fontSize="small" />} selected={item.id === question.id} onClick={() => onSelectQuestion(item.id)} trailing={<Chip size="small" label={acceptedPlayers} />} />;
          })}
        </Stack></CardContent></Card>

        <Stack spacing={2.25} sx={{ flex: 1, minWidth: 0 }}>
          <Card><CardContent><Stack spacing={1.5}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }}><Typography variant="h5">Вопрос {question.questionIndex}</Typography><Chip label={questionStatusLabel[question.status]} /></Stack>
            {canModerate && question.status === "active" ? <AppPillButton disabled={busy} onClick={() => onQuestionAction(question.id, "complete")}>Завершить вопрос</AppPillButton> : null}
            <Divider />
            <MessagePreview label="Сообщение с вопросом" text={question.generatedMessage} />
            <MessagePreview label="Сообщение с правильным ответом" text={question.generatedAnswerMessage} />
          </Stack></CardContent></Card>

          {canModerate ? <Card><CardContent><Stack spacing={1.25}>
            <Typography variant="h5">Фрагменты чата</Typography>
            <Typography variant="body2" color="text.secondary">Вставьте сообщения из игрового чата. «Заменить» покажет кандидатов, которых можно исключить до сохранения.</Typography>
            <AppTextInput multiline minRows={5} label="Фрагмент чата" value={chatText} disabled={busy} onChange={(inputEvent) => setChatText(inputEvent.target.value)} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <AppPillButton disabled={busy || !chatText.trim()} onClick={() => onImport(question.id, "append", chatText)}>Дополнить</AppPillButton>
              <AppPillButton variant="outlined" disabled={busy || !chatText.trim()} onClick={() => void requestPreview()}>Заменить…</AppPillButton>
            </Stack>
            {previewForQuestion ? <Card variant="outlined"><CardContent><Stack spacing={1}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}><Stack><Typography variant="subtitle1">Кандидаты для замены</Typography><Typography variant="body2" color="text.secondary">Все уже выбраны. Снимите галочки с неверных ответов.</Typography></Stack><Chip size="small" label={`${previewForQuestion.selectedKeys.length} из ${previewForQuestion.candidates.length}`} /></Stack>
              {previewForQuestion.candidates.length ? previewForQuestion.candidates.map((candidate) => <Stack key={candidate.canonicalKey} direction="row" spacing={1} alignItems="flex-start" sx={{ p: 1, borderRadius: 1, bgcolor: "action.hover" }}><Checkbox size="small" checked={previewForQuestion.selectedKeys.includes(candidate.canonicalKey)} onChange={() => toggleCandidate(candidate.canonicalKey)} /><Stack spacing={0.25} sx={{ pt: 0.5, minWidth: 0 }}><Typography fontWeight={700}>{candidate.playerName}</Typography><Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{candidate.rawMessage}</Typography></Stack></Stack>) : <Alert severity="info">В этом фрагменте не нашлось сообщений ведущему или клану.</Alert>}
              {previewForQuestion.candidates.length ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><AppPillButton size="small" variant="outlined" disabled={busy} onClick={() => setChatPreview({ ...previewForQuestion, selectedKeys: previewForQuestion.candidates.map((candidate) => candidate.canonicalKey) })}>Выбрать все</AppPillButton><AppPillButton size="small" variant="outlined" disabled={busy} onClick={() => setChatPreview({ ...previewForQuestion, selectedKeys: [] })}>Снять все</AppPillButton><AppPillButton size="small" disabled={busy} onClick={() => { onImport(question.id, "replace", chatText, previewForQuestion.selectedKeys); setChatPreview(null); }}>Сохранить {previewForQuestion.selectedKeys.length} ответов</AppPillButton></Stack> : null}
            </Stack></CardContent></Card> : null}
            {question.chatFragments.map((fragment) => <Card variant="outlined" key={fragment.id}><CardContent><Stack spacing={0.75}><Stack direction="row" justifyContent="space-between" spacing={1}><Typography variant="subtitle2">{fragment.mode === "replace" ? "Заменены фрагменты" : "Добавлен фрагмент"}</Typography><Chip size="small" label={`${question.answers.filter((answer) => answer.fragmentId === fragment.id).length} кандидатов`} color={fragment.isActive ? "info" : "default"} /></Stack><Typography variant="caption" color="text.secondary">{new Date(fragment.insertedAt).toLocaleString("ru-RU")}</Typography><Typography component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", overflowWrap: "anywhere" }}>{fragment.rawText}</Typography></Stack></CardContent></Card>)}
          </Stack></CardContent></Card> : null}

          <Card><CardContent><Stack spacing={1.25}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}><Typography variant="h5">Кандидаты на ответ</Typography>{canModerate && pendingAnswerIds.length ? <Stack direction="row" spacing={1}><AppPillButton size="small" disabled={busy} onClick={() => onBulkStatus(question.id, pendingAnswerIds, "accepted")}>Принять все ({pendingAnswerIds.length})</AppPillButton><AppPillButton size="small" disabled={busy} variant="outlined" onClick={() => onBulkStatus(question.id, pendingAnswerIds, "rejected")}>Отклонить все</AppPillButton></Stack> : null}</Stack>{visibleAnswers.length ? visibleAnswers.map((answer) => <Card variant="outlined" key={answer.id}><CardContent><Stack spacing={0.75}><Typography>{answer.playerName}: {answer.rawMessage}</Typography><Typography variant="caption">{answer.status}{answer.position ? ` · место ${answer.position}` : ""}{answer.awards.length ? ` · ${formatResourceAmounts(answer.awards.flatMap((award) => award.resolvedRewards), event.quizSnapshot.resources)}` : ""}</Typography>{canModerate ? <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><AppPillButton size="small" disabled={busy} variant={answer.status === "accepted" ? "contained" : "outlined"} onClick={() => onStatus(question.id, answer.id, "accepted")}>Принять</AppPillButton><AppPillButton size="small" disabled={busy} variant={answer.status === "rejected" ? "contained" : "outlined"} onClick={() => onStatus(question.id, answer.id, "rejected")}>Отклонить</AppPillButton><AppPillButton size="small" disabled={busy} variant="outlined" onClick={() => onStatus(question.id, answer.id, "pending")}>В ожидание</AppPillButton></Stack> : null}</Stack></CardContent></Card>) : <Alert severity="info">Пока нет распознанных кандидатов.</Alert>}</Stack></CardContent></Card>

          {event.summary ? <Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Промежуточные результаты</Typography><Typography variant="body2" color="text.secondary">Завершено вопросов: {event.summary.completedQuestions} из {event.summary.totalQuestions}. Уникальных верных ответов: {event.summary.totalUniqueCorrectAnswers}.</Typography><Table size="small"><TableHead><TableRow><TableCell>Игрок</TableCell><TableCell align="right">Верных</TableCell><TableCell>Обычные</TableCell><TableCell>Бонусы</TableCell><TableCell>Итого</TableCell></TableRow></TableHead><TableBody>{event.summary.players.map((player) => <TableRow key={player.playerName}><TableCell>{player.playerName}</TableCell><TableCell align="right">{player.correctAnswers}</TableCell><TableCell>{formatResourceAmounts(player.regularRewards, event.quizSnapshot.resources) || "—"}</TableCell><TableCell>{formatResourceAmounts(player.bonusRewards, event.quizSnapshot.resources) || "—"}</TableCell><TableCell>{formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "—"}</TableCell></TableRow>)}</TableBody></Table><AppTextInput multiline minRows={5} label="Для администрации" value={summaryText} InputProps={{ readOnly: true }} /><AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(summaryText)} sx={{ alignSelf: "flex-start" }}>Копировать ведомость</AppPillButton></Stack></CardContent></Card> : null}
        </Stack>
      </Stack>
    </Stack>
  );
}
