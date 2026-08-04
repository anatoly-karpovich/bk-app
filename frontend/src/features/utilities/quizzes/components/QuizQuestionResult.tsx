import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import type { ResourceDefinition } from "../../../rewards/types";
import type { QuizEventQuestion } from "../types";

interface QuizQuestionResultProps {
  question: QuizEventQuestion;
  resources: ResourceDefinition[];
}

export default function QuizQuestionResult({ question, resources }: QuizQuestionResultProps) {
  if (!question.ranking.length && !question.reviewedAt) return null;
  return <Card><CardContent><Stack spacing={1.25}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }}><Typography variant="h5">Результат вопроса</Typography><Chip label={question.reviewedAt ? "Проверен" : "Предварительный рейтинг"} color={question.reviewedAt ? "success" : "warning"} /></Stack>{question.ranking.length ? <Stack spacing={0.5}>{question.ranking.map((answer) => <Typography key={answer.selectedMessageId}>{answer.position}. {answer.playerName} · {answer.timestamp ?? "без времени"}</Typography>)}</Stack> : <Typography color="text.secondary">Ни один ответ не включён в рейтинг.</Typography>}{question.reviewedAt ? <><Typography variant="body2" color="text.secondary">Проверено: {new Date(question.reviewedAt).toLocaleString("ru-RU")}</Typography>{question.awards.length ? <Stack spacing={0.5}>{question.awards.map((award) => <Typography key={award.id}>{award.playerName}: {formatResourceAmounts(award.rewards, resources) || "без награды"}</Typography>)}</Stack> : <Typography variant="body2" color="text.secondary">Награды по этому вопросу отсутствуют.</Typography>}</> : null}</Stack></CardContent></Card>;
}
