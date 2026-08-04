import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import AppSelectableListItem from "../../../../components/ui/AppSelectableListItem";
import type { QuizEventQuestion } from "../types";
import { getQuizQuestionStateLabel, getQuizQuestionStateTone, getShortQuizQuestionText } from "./quizEventWorkspace.helpers";

interface QuizEventQuestionNavigationProps {
  questions: QuizEventQuestion[];
  selectedQuestionId: string;
  onSelectQuestion: (questionId: string) => void;
}

export default function QuizEventQuestionNavigation({ questions, selectedQuestionId, onSelectQuestion }: QuizEventQuestionNavigationProps) {
  return <Card sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0 }}><CardContent><Stack spacing={1}><Typography variant="h5">Вопросы</Typography>{questions.map((question) => <AppSelectableListItem key={question.id} primaryText={`Вопрос ${question.questionIndex}`} secondaryText={`${getQuizQuestionStateLabel(question)} · ${getShortQuizQuestionText(question.questionText)}`} icon={<CheckCircleRoundedIcon fontSize="small" />} selected={question.id === selectedQuestionId} onClick={() => onSelectQuestion(question.id)} trailing={<Chip size="small" color={getQuizQuestionStateTone(question)} label={question.ranking.length} />} />)}</Stack></CardContent></Card>;
}
