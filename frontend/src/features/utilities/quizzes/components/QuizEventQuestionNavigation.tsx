import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import AppSelectableListItem from "../../../../components/ui/AppSelectableListItem";
import type { QuizEventQuestion } from "../types";
import { getQuizQuestionStateLabel, getShortQuizQuestionText } from "./quizEventWorkspace.helpers";

interface QuizEventQuestionNavigationProps {
  questions: QuizEventQuestion[];
  selectedQuestionId: string;
  onSelectQuestion: (questionId: string) => void;
  summary: string | null;
  summarySelected: boolean;
  onSelectSummary: () => void;
}

function questionIcon(question: QuizEventQuestion) {
  if (question.reviewedAt) return <CheckRoundedIcon fontSize="small" />;
  if (question.conductedOrder !== null) return <PriorityHighRoundedIcon fontSize="small" />;
  return null;
}

function questionIconSx(question: QuizEventQuestion) {
  if (question.reviewedAt) return { width: 32, height: 32, borderRadius: "50%", bgcolor: "success.main", color: "common.white" };
  if (question.conductedOrder !== null) return { width: 32, height: 32, borderRadius: "50%", bgcolor: "#ffd95f", color: "#7d5900" };
  return { width: 32, height: 32, border: 2, borderColor: "#c9d1da", borderRadius: "50%", bgcolor: "#f8fafc" };
}

export default function QuizEventQuestionNavigation({
  questions,
  selectedQuestionId,
  onSelectQuestion,
  summary,
  summarySelected,
  onSelectSummary,
}: QuizEventQuestionNavigationProps) {
  return (
    <Card
      sx={{
        width: { xs: "100%", lg: 340 },
        flexShrink: 0,
        position: { lg: "sticky" },
        top: { lg: 102 },
        maxHeight: { lg: "calc(100vh - 126px)" },
        overflowY: "auto",
      }}
    >
      <CardContent sx={{ p: 1.75 }}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5, pb: 0.5 }}>
            <Typography variant="h5">Вопросы</Typography>
            <Typography variant="caption" fontWeight={700} color="text.secondary">{questions.length} вопросов</Typography>
          </Stack>

          {questions.map((question) => {
            const selected = !summarySelected && question.id === selectedQuestionId;
            const answerCount = question.ranking.length;
            return (
              <AppSelectableListItem
                key={question.id}
                primaryText={`Вопрос ${question.questionIndex} · ${getQuizQuestionStateLabel(question)}`}
                secondaryText={getShortQuizQuestionText(question.questionText)}
                icon={questionIcon(question)}
                iconSx={questionIconSx(question)}
                selected={selected}
                onClick={() => onSelectQuestion(question.id)}
                trailing={<Box
                  sx={{
                    width: 27,
                    height: 27,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    bgcolor: question.reviewedAt ? "success.main" : question.conductedOrder !== null ? "#ffd84a" : "#eef1f4",
                    color: question.reviewedAt ? "common.white" : question.conductedOrder !== null ? "#5e4700" : "text.secondary",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {answerCount}
                </Box>}
              />
            );
          })}

          {summary ? (
            <Box sx={{ mt: 0.5 }}><AppSelectableListItem primaryText="Итоги проведения" secondaryText={summary} icon={<SummarizeRoundedIcon fontSize="small" />} iconSx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "rgba(79, 70, 229, 0.1)", color: "primary.main" }} selected={summarySelected} onClick={onSelectSummary} /></Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
