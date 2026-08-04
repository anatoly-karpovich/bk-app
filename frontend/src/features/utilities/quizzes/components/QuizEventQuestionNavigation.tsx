import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
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

function QuestionStateIcon({ question }: { question: QuizEventQuestion }) {
  if (question.reviewedAt) {
    return <Box sx={{ width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "success.main", color: "common.white" }}><CheckRoundedIcon fontSize="small" /></Box>;
  }
  if (question.conductedOrder !== null) {
    return <Box sx={{ width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#ffd95f", color: "#7d5900" }}><PriorityHighRoundedIcon fontSize="small" /></Box>;
  }
  return <Box sx={{ width: 32, height: 32, border: 2, borderColor: "#c9d1da", borderRadius: "50%", bgcolor: "#f8fafc" }} />;
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
              <Box
                key={question.id}
                component="button"
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectQuestion(question.id)}
                sx={{
                  width: "100%",
                  p: 1.25,
                  border: 1,
                  borderColor: selected ? "primary.light" : "divider",
                  borderRadius: 2.25,
                  bgcolor: selected ? "rgba(79, 70, 229, 0.055)" : "background.paper",
                  boxShadow: selected ? "0 0 0 1px rgba(79, 70, 229, 0.08)" : "none",
                  display: "grid",
                  gridTemplateColumns: "32px minmax(0, 1fr) 27px",
                  alignItems: "center",
                  gap: 1.25,
                  color: "text.primary",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "border-color 160ms ease, background-color 160ms ease",
                  "&:hover": { borderColor: "primary.light", bgcolor: "rgba(79, 70, 229, 0.025)" },
                  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
                }}
              >
                <QuestionStateIcon question={question} />
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={0.5} alignItems="baseline" flexWrap="wrap" useFlexGap>
                    <Typography variant="subtitle2" noWrap>Вопрос {question.questionIndex}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{getQuizQuestionStateLabel(question)}</Typography>
                  </Stack>
                  <Typography variant="caption" display="block" noWrap sx={{ mt: 0.25, color: "#39414a" }}>{getShortQuizQuestionText(question.questionText)}</Typography>
                </Box>
                <Box
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
                </Box>
              </Box>
            );
          })}

          {summary ? (
            <Box
              component="button"
              type="button"
              aria-pressed={summarySelected}
              onClick={onSelectSummary}
              sx={{
                mt: 0.5,
                p: 1.25,
                border: 1,
                borderRadius: 2.25,
                display: "grid",
                gridTemplateColumns: "32px minmax(0, 1fr)",
                gap: 1.25,
                alignItems: "center",
                color: "text.primary",
                textAlign: "left",
                cursor: "pointer",
                boxShadow: summarySelected ? "0 0 0 1px rgba(79, 70, 229, 0.08)" : "none",
                borderColor: summarySelected ? "primary.light" : "divider",
                bgcolor: summarySelected ? "rgba(79, 70, 229, 0.055)" : "#f8fafc",
                "&:hover": { borderColor: "primary.light", bgcolor: "rgba(79, 70, 229, 0.025)" },
              }}
            >
              <Box sx={{ width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "rgba(79, 70, 229, 0.1)", color: "primary.main" }}><SummarizeRoundedIcon fontSize="small" /></Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2">Итоги проведения</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>{summary}</Typography>
              </Box>
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
