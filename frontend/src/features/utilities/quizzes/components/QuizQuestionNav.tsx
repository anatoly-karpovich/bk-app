import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import AppInfoAlert from "../../../../components/ui/AppInfoAlert";
import AppSelectableListItem from "../../../../components/ui/AppSelectableListItem";
import { isQuestionComplete } from "../quizEditor.helpers";
import type { QuizQuestionDraft } from "../types";

export type QuizEditorSection = "general" | string;

interface QuizQuestionNavProps {
  questions: readonly QuizQuestionDraft[];
  activeSection: QuizEditorSection;
  editable: boolean;
  onSelect: (section: QuizEditorSection) => void;
  onReorder: (sourceId: string, targetId: string) => void;
}

export default function QuizQuestionNav({ questions, activeSection, editable, onSelect, onReorder }: QuizQuestionNavProps) {
  const completeCount = questions.filter(isQuestionComplete).length;
  const handleDrop = (targetId: string, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/quiz-question-id");
    if (editable && sourceId) onReorder(sourceId, targetId);
  };

  return (
    <Card sx={{ position: { lg: "sticky" }, top: { lg: 104 }, maxHeight: { lg: "calc(100vh - 126px)" }, overflow: "auto", boxShadow: "0 12px 30px rgba(28, 39, 55, 0.08)" }}>
      <CardContent sx={{ p: 1.75 }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5 }}>
            <Typography variant="h5">Викторина</Typography>
            <Typography variant="caption" fontWeight={800} color="text.secondary">{completeCount}/{questions.length} готовы</Typography>
          </Stack>

          <Stack spacing={1}>
            <AppSelectableListItem
              primaryText="Общие сведения"
              secondaryText="Название и описание"
              icon={<EditNoteRoundedIcon fontSize="small" />}
              selected={activeSection === "general"}
              onClick={() => onSelect("general")}
              iconSx={{ width: 32, height: 32, borderRadius: "50%" }}
            />
            {questions.map((question) => {
              const complete = isQuestionComplete(question);
              return (
                <Box
                  key={question.id}
                  draggable={editable}
                  onDragStart={(event) => event.dataTransfer.setData("text/quiz-question-id", question.id)}
                  onDragOver={(event) => editable && event.preventDefault()}
                  onDrop={(event) => handleDrop(question.id, event)}
                  sx={{ cursor: editable ? "grab" : "default", "&:active": { cursor: editable ? "grabbing" : "default" } }}
                >
                  <AppSelectableListItem
                    primaryText={`Вопрос ${question.questionIndex}`}
                    secondaryText={complete ? question.text : "Нужны вопрос и ответ"}
                    icon={complete ? <CheckCircleRoundedIcon fontSize="small" /> : <ErrorOutlineRoundedIcon fontSize="small" />}
                    selected={activeSection === question.id}
                    onClick={() => onSelect(question.id)}
                    iconSx={complete
                      ? { width: 32, height: 32, borderRadius: "50%", bgcolor: "success.main", color: "success.contrastText" }
                      : { width: 32, height: 32, borderRadius: "50%", bgcolor: "warning.light", color: "warning.contrastText" }}
                    trailing={editable ? <DragIndicatorRoundedIcon fontSize="small" color="disabled" /> : null}
                  />
                </Box>
              );
            })}
          </Stack>

          {editable ? <AppInfoAlert>Перетаскивайте вопросы, чтобы изменить их порядок. Изменения сохраняются вместе с викториной.</AppInfoAlert> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
