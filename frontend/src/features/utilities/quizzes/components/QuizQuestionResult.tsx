import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Accordion, AccordionDetails, AccordionSummary, Chip, Stack, Typography } from "@mui/material";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import type { ResourceDefinition } from "../../../rewards/types";
import type { QuizEventQuestion } from "../types";

interface QuizQuestionResultProps {
  question: QuizEventQuestion;
  resources: ResourceDefinition[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export default function QuizQuestionResult({ question, resources, expanded, onExpandedChange }: QuizQuestionResultProps) {
  if (!question.ranking.length && !question.reviewedAt) return null;
  return <Accordion expanded={expanded} onChange={(_, next) => onExpandedChange(next)}><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Stack direction="row" spacing={1} alignItems="center"><Typography variant="h5">Результат вопроса</Typography><Chip label={question.reviewedAt ? "Проверен" : "Предварительный рейтинг"} color={question.reviewedAt ? "success" : "warning"} /></Stack></AccordionSummary><AccordionDetails><Stack spacing={1.25}>{question.ranking.length ? <Stack spacing={0.5}>{question.ranking.map((answer) => <Typography key={answer.selectedMessageId}>{answer.position}. {answer.playerName} · {answer.timestamp ?? "без времени"}</Typography>)}</Stack> : <Typography color="text.secondary">Ни один ответ не включён в рейтинг.</Typography>}{question.reviewedAt ? <><Typography variant="body2" color="text.secondary">Проверено: {new Date(question.reviewedAt).toLocaleString("ru-RU")}</Typography>{question.awards.length ? <Stack spacing={0.5}>{question.awards.map((award) => <Typography key={award.id}>{award.playerName}: {formatResourceAmounts(award.rewards, resources) || "без награды"}</Typography>)}</Stack> : <Typography variant="body2" color="text.secondary">Награды по этому вопросу отсутствуют.</Typography>}</> : null}</Stack></AccordionDetails></Accordion>;
}
