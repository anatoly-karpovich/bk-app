import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import AppInfoAlert from "../../../../components/ui/AppInfoAlert";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppSelectableListItem from "../../../../components/ui/AppSelectableListItem";
import type { QuizQuestionDraft } from "../types";
import { isQuestionComplete } from "../quizEditor.helpers";

export type QuizEditorSection = "general" | string;

interface QuizQuestionNavProps {
  questions: readonly QuizQuestionDraft[];
  activeSection: QuizEditorSection;
  editable: boolean;
  onSelect: (section: QuizEditorSection) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  configControl?: ReactNode;
  startAction?: { label: string; disabled?: boolean; onClick: () => void };
}

export default function QuizQuestionNav({ questions, activeSection, editable, onSelect, onReorder, configControl, startAction }: QuizQuestionNavProps) {
  const handleDrop = (targetId: string, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/quiz-question-id");
    if (editable && sourceId) onReorder(sourceId, targetId);
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="h5">Викторина</Typography>
            <Typography variant="body2" color="text.secondary">Сведения и порядок вопросов</Typography>
          </Stack>

          {configControl}
          {startAction ? <AppPillButton variant="contained" onClick={startAction.onClick} disabled={startAction.disabled}>{startAction.label}</AppPillButton> : null}

          <Stack spacing={1}>
            {questions.length ? <AppSelectableListItem primaryText="Общие сведения" secondaryText="Название и описание" icon={<EditNoteRoundedIcon fontSize="small" />} selected={activeSection === "general"} onClick={() => onSelect("general")} /> : null}
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
                    secondaryText={complete ? "Заполнен" : "Нужны вопрос и ответ"}
                    icon={<HelpOutlineRoundedIcon fontSize="small" />}
                    selected={activeSection === question.id}
                    onClick={() => onSelect(question.id)}
                    trailing={
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        {editable ? <DragIndicatorRoundedIcon fontSize="small" color="disabled" /> : null}
                        {complete ? <CheckCircleRoundedIcon color="success" fontSize="small" /> : <ErrorOutlineRoundedIcon color="warning" fontSize="small" />}
                      </Stack>
                    }
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
