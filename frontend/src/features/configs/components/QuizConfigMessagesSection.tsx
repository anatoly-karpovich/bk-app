import { useState } from "react";
import { Card, CardContent, Stack, Typography } from "@mui/material";
import AppSegmentedTabs from "../../../components/ui/AppSegmentedTabs";
import { quizConfigsTexts } from "../../../texts/quizConfigsTexts";
import QuizTemplatesEditor from "../../utilities/quizzes/components/QuizTemplatesEditor";
import type { QuizConfig } from "../../utilities/quizzes/types";

interface QuizConfigMessagesSectionProps {
  config: QuizConfig;
  disabled: boolean;
  onChange: (patch: Partial<QuizConfig>) => void;
}

export default function QuizConfigMessagesSection({ config, disabled, onChange }: QuizConfigMessagesSectionProps) {
  const [activeKind, setActiveKind] = useState<"question" | "answer">("question");
  const texts = quizConfigsTexts.editor.messages;
  const isQuestion = activeKind === "question";

  return <Card><CardContent><Stack spacing={2}>
    <Stack spacing={0.25}><Typography variant="h5">Шаблоны сообщений</Typography><Typography variant="body2" color="text.secondary">Тексты вопроса и правильного ответа, которые ведущий публикует в чате.</Typography></Stack>
    <AppSegmentedTabs value={activeKind} tabs={[{ value: "question", label: texts.question }, { value: "answer", label: texts.answer }]} onChange={(value) => setActiveKind(value as "question" | "answer")} />
    <QuizTemplatesEditor label={isQuestion ? texts.question : texts.answer} messageKind={activeKind} templates={isQuestion ? config.messageTemplates : config.answerMessageTemplates} questionCount={config.questionCount} disabled={disabled} onChange={(templates) => onChange(isQuestion ? { messageTemplates: templates } : { answerMessageTemplates: templates })} />
  </Stack></CardContent></Card>;
}
