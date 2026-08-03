import { Card, CardContent, Stack, Typography } from "@mui/material";
import { quizConfigsTexts } from "../../../texts/quizConfigsTexts";
import QuizTemplatesEditor from "../../utilities/quizzes/components/QuizTemplatesEditor";
import type { QuizConfig } from "../../utilities/quizzes/types";

interface QuizConfigMessagesSectionProps {
  config: QuizConfig;
  disabled: boolean;
  onChange: (patch: Partial<QuizConfig>) => void;
}

export default function QuizConfigMessagesSection({ config, disabled, onChange }: QuizConfigMessagesSectionProps) {
  const texts = quizConfigsTexts.editor.messages;

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="h5">{texts.title}</Typography>
            <Typography variant="body2" color="text.secondary">{texts.description}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">{texts.availableVariables}</Typography>
          <Stack spacing={1}>
            <Typography variant="subtitle1">{texts.question}</Typography>
            <QuizTemplatesEditor
              label={texts.question}
              messageKind="question"
              templates={config.messageTemplates}
              questionCount={config.questionCount}
              disabled={disabled}
              onChange={(messageTemplates) => onChange({ messageTemplates })}
            />
          </Stack>
          <Stack spacing={1}>
            <Typography variant="subtitle1">{texts.answer}</Typography>
            <QuizTemplatesEditor
              label={texts.answer}
              messageKind="answer"
              templates={config.answerMessageTemplates}
              questionCount={config.questionCount}
              disabled={disabled}
              onChange={(answerMessageTemplates) => onChange({ answerMessageTemplates })}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
