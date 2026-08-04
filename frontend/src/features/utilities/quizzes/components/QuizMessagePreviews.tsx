import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { Card, CardContent, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import type { QuizEventQuestion } from "../types";

function copy(text: string): void {
  void navigator.clipboard?.writeText(text);
}

function MessagePreview({ label, text }: { label: string; text: string }) {
  return <Card variant="outlined"><CardContent><Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start"><Stack spacing={0.5} sx={{ minWidth: 0 }}><Typography variant="overline" color="text.secondary">{label}</Typography><Typography component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", overflowWrap: "anywhere" }}>{text}</Typography></Stack><AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(text)}>Копировать</AppPillButton></Stack></CardContent></Card>;
}

export default function QuizMessagePreviews({ question }: { question: QuizEventQuestion }) {
  return <Stack spacing={1.5}><MessagePreview label="Сообщение с вопросом" text={question.generatedMessage} /><MessagePreview label="Сообщение с правильным ответом" text={question.generatedAnswerMessage} /></Stack>;
}
