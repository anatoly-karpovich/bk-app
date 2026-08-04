import { useEffect, useState } from "react";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, Typography } from "@mui/material";
import AppConfirmDialog from "../../../../components/ui/AppConfirmDialog";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppTextInput from "../../../../components/ui/AppTextInput";
import type { QuizChatMutationResult, QuizEventQuestion } from "../types";

interface Props {
  question: QuizEventQuestion;
  busy: boolean;
  editable: boolean;
  onSave: (questionId: string, rawText: string) => Promise<QuizChatMutationResult | null>;
}

export default function QuizChatControls({ question, busy, editable, onSave }: Props) {
  const [rawText, setRawText] = useState(question.chat.rawText);
  const [confirmClear, setConfirmClear] = useState(false);
  const [result, setResult] = useState<QuizChatMutationResult["mutation"] | null>(null);
  const [expanded, setExpanded] = useState(true);
  const changed = rawText !== question.chat.rawText;
  const messagesCount = question.playerGroups.reduce((count, group) => count + group.messages.length, 0);

  useEffect(() => {
    setRawText(question.chat.rawText);
    setResult(null);
  }, [question.chat.rawText, question.id]);

  const save = async () => {
    const response = await onSave(question.id, rawText);
    if (response) setResult(response.mutation);
  };
  const requestSave = () => !rawText.trim() && question.playerGroups.length > 0 ? setConfirmClear(true) : void save();

  if (!editable) return null;

  return (
    <>
      <Accordion
        expanded={expanded}
        onChange={(_, next) => setExpanded(next)}
        sx={{ borderRadius: "20px !important", overflow: "hidden", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)", "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: { xs: 2, sm: 2.75 }, py: 0.5, "& .MuiAccordionSummary-content": { my: 1.5 } }}>
          <Stack spacing={0.5}>
            <Typography variant="h5">Чат</Typography>
            <Typography variant="body2" color="text.secondary">Вставьте полную текущую версию чата — она полностью заменит сохранённую.</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, borderTop: 1, borderColor: "divider" }}>
          <Box sx={{ p: { xs: 2, sm: 2.75 } }}>
          <Stack spacing={1.5}>
            <AppTextInput
              multiline
              minRows={7}
              aria-label="Текст чата"
              value={rawText}
              disabled={busy}
              onChange={(event) => setRawText(event.target.value)}
              inputSx={{ "& textarea": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: 1.55 } }}
            />
            {changed && question.playerGroups.length > 0 ? (
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", p: 1.5, borderRadius: 2, bgcolor: "#fff7dc", color: "#725800" }}>
                <WarningAmberRoundedIcon fontSize="small" sx={{ mt: 0.1 }} />
                <Typography variant="caption">Изменение сохранённого чата сбросит результат вопроса и начисленные награды. Перед сохранением потребуется подтверждение.</Typography>
              </Box>
            ) : null}
            {result ? <Typography variant="caption" color={result.effectiveChange ? "success.main" : "text.secondary"}>Кандидатов: {result.candidateMessagesCount}; дубликатов: {result.duplicateMessagesCount}.</Typography> : null}
          </Stack>
          </Box>
          <Box sx={{ px: { xs: 2, sm: 2.75 }, py: 1.75, borderTop: 1, borderColor: "divider", bgcolor: "#fafbfc", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Typography variant="caption" fontWeight={700} color={rawText.trim() ? "success.dark" : "text.secondary"}>
              {rawText.trim() ? `Чат обработан · ${question.playerGroups.length} игроков · ${messagesCount} сообщений` : "Добавьте чат, чтобы распознать ответы"}
            </Typography>
            <AppPillButton variant="contained" disabled={busy || !changed} onClick={requestSave}>Сохранить чат</AppPillButton>
          </Box>
        </AccordionDetails>
      </Accordion>
      <AppConfirmDialog
        open={confirmClear}
        title="Очистить сохранённый чат?"
        description="Будут удалены сообщения и сохранённый результат вопроса. Факт проведения сохранится."
        confirmLabel="Очистить"
        cancelLabel="Отмена"
        confirmColor="error"
        loading={busy}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => { setConfirmClear(false); void save(); }}
      />
    </>
  );
}
