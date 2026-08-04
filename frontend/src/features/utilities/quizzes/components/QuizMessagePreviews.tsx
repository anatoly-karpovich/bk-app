import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { Box, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import type { QuizEventQuestion } from "../types";

function copy(text: string): void {
  void navigator.clipboard?.writeText(text);
}

function MessagePreview({ label, text }: { label: string; text: string }) {
  return (
    <Box sx={{ minWidth: 0, p: 2.25, pr: { xs: 2.25, sm: 14 }, border: 1, borderColor: "divider", borderRadius: 2.25, position: "relative" }}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>{label}</Typography>
      <Typography component="pre" sx={{ m: 0, mt: 1, whiteSpace: "pre-wrap", fontFamily: "inherit", overflowWrap: "anywhere" }}>{text}</Typography>
      <AppPillButton
        size="small"
        variant="outlined"
        startIcon={<ContentCopyRoundedIcon fontSize="small" />}
        onClick={() => copy(text)}
        sx={{ position: { sm: "absolute" }, top: { sm: 14 }, right: { sm: 14 }, mt: { xs: 1.5, sm: 0 } }}
      >
        Копировать
      </AppPillButton>
    </Box>
  );
}

export default function QuizMessagePreviews({ question }: { question: QuizEventQuestion }) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.75}>
      <Box sx={{ flex: 1, minWidth: 0 }}><MessagePreview label="Сообщение с вопросом" text={question.generatedMessage} /></Box>
      <Box sx={{ flex: 1, minWidth: 0 }}><MessagePreview label="Сообщение с правильным ответом" text={question.generatedAnswerMessage} /></Box>
    </Stack>
  );
}
