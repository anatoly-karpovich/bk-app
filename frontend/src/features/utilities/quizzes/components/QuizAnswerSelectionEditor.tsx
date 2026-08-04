import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Accordion, AccordionDetails, AccordionSummary, Box, Checkbox, Radio, Stack, Typography } from "@mui/material";
import AppChip from "../../../../components/ui/AppChip";
import AppPillButton from "../../../../components/ui/AppPillButton";
import type { QuizAnswerSelectionDraft, QuizEventQuestion, QuizPlayerMessageGroup } from "../types";

interface QuizAnswerSelectionEditorProps {
  question: QuizEventQuestion;
  draft: QuizAnswerSelectionDraft | undefined;
  dirty: boolean;
  editable: boolean;
  busy: boolean;
  onPlayerSelected: (playerName: string, isSelected: boolean) => void;
  onPlayerSelectedMessage: (playerName: string, selectedMessageId: string) => void;
  onSave: () => void;
  canRequestRecheck: boolean;
  onRequestRecheck: () => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

function PlayerAnswerGroup({
  group,
  choice,
  editable,
  busy,
  onSelected,
  onSelectedMessage,
}: {
  group: QuizPlayerMessageGroup;
  choice: QuizAnswerSelectionDraft[string] | undefined;
  editable: boolean;
  busy: boolean;
  onSelected: (isSelected: boolean) => void;
  onSelectedMessage: (selectedMessageId: string) => void;
}) {
  const selectedMessageId = choice?.selectedMessageId ?? group.selectedMessageId ?? group.messages[0]?.id ?? null;
  const isSelected = choice?.isSelected ?? group.selectedMessageId !== null;
  const hasAlternatives = group.messages.length > 1;

  return (
    <Box sx={{ border: 1, borderColor: isSelected ? "primary.light" : "divider", borderRadius: 2.25, p: 1.75, bgcolor: isSelected ? "rgba(79, 70, 229, 0.025)" : "background.paper", opacity: isSelected ? 1 : 0.8 }}>
      <Stack spacing={0.75}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack direction="row" alignItems="center" spacing={0.5} minWidth={0}>
            <Checkbox size="small" disabled={!editable || busy} checked={isSelected} onChange={(event) => onSelected(event.target.checked)} />
            <Typography fontWeight={700} noWrap>{group.playerName}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap>{group.messages.length} {group.messages.length === 1 ? "ответ" : "ответа"}</Typography>
        </Stack>

        {group.messages.map((message) => (
          <Stack key={message.id} direction="row" spacing={0.75} alignItems="flex-start" sx={{ pt: 0.75, borderTop: hasAlternatives ? 1 : 0, borderStyle: hasAlternatives ? "dashed" : "solid", borderColor: hasAlternatives ? "divider" : "transparent" }}>
            {hasAlternatives ? <Radio size="small" disabled={!editable || busy} checked={selectedMessageId === message.id} onChange={() => onSelectedMessage(message.id)} /> : <Box sx={{ width: 32, flexShrink: 0 }} />}
            <Typography variant="caption" color="text.secondary" sx={{ width: 42, pt: 0.75, flexShrink: 0 }}>{message.timestamp ?? "—"}</Typography>
            <Typography variant="body2" sx={{ pt: 0.55, overflowWrap: "anywhere" }}>{message.text}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function QuizAnswerSelectionEditor({ question, draft, dirty, editable, busy, onPlayerSelected, onPlayerSelectedMessage, onSave, canRequestRecheck, onRequestRecheck, expanded, onExpandedChange }: QuizAnswerSelectionEditorProps) {
  const selectedPlayersCount = question.playerGroups.filter((group) => draft?.[group.playerName]?.isSelected ?? group.selectedMessageId !== null).length;
  const allPlayersSelected = question.playerGroups.length > 0 && selectedPlayersCount === question.playerGroups.length;
  const canSaveResult = question.conductedOrder !== null && (dirty || question.reviewedAt === null);
  const setAllPlayersSelected = () => question.playerGroups.forEach((group) => onPlayerSelected(group.playerName, !allPlayersSelected));

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => onExpandedChange(next)}
      sx={{ borderRadius: "20px !important", overflow: "hidden", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)", "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: { xs: 2, sm: 2.75 }, py: 0.5, "& .MuiAccordionSummary-content": { my: 1.5 } }}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h5">Ответы игроков</Typography>
            <AppChip size="small" label={`${selectedPlayersCount} выбрано`} color="primary" sx={{ bgcolor: "rgba(79, 70, 229, 0.1)", color: "primary.main" }} />
          </Stack>
          <Typography variant="body2" color="text.secondary">Отметьте верные ответы. При нескольких сообщениях выберите одно.</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 2, sm: 2.75 }, pt: 0, pb: 2.75, borderTop: 1, borderColor: "divider" }}>
        <Stack spacing={1.75} sx={{ pt: 2 }}>
          {question.playerGroups.length ? (
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" fontWeight={700}>Выбрано {selectedPlayersCount} из {question.playerGroups.length}</Typography>
              <AppPillButton size="small" variant="text" disabled={!editable || busy} onClick={setAllPlayersSelected}>{allPlayersSelected ? "Снять выбор" : "Выбрать всех"}</AppPillButton>
            </Stack>
          ) : null}
          {question.playerGroups.length ? (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
              {question.playerGroups.map((group) => (
                <PlayerAnswerGroup
                  key={group.playerName}
                  group={group}
                  choice={draft?.[group.playerName]}
                  editable={editable}
                  busy={busy}
                  onSelected={(isSelected) => onPlayerSelected(group.playerName, isSelected)}
                  onSelectedMessage={(selectedMessageId) => onPlayerSelectedMessage(group.playerName, selectedMessageId)}
                />
              ))}
            </Box>
          ) : <Typography variant="body2" color="text.secondary">Пока нет распознанных кандидатов.</Typography>}

          {editable ? (
            <Box sx={{ position: "sticky", bottom: 12, zIndex: 1, display: "flex", justifyContent: dirty ? "space-between" : "flex-end", alignItems: "center", gap: 1.5, flexWrap: "wrap", mt: 0.5, px: 1.75, py: 1.25, border: 1, borderColor: "rgba(79, 70, 229, 0.2)", borderRadius: 2.25, bgcolor: "rgba(250, 249, 255, 0.97)", boxShadow: "0 12px 24px rgba(49, 43, 130, 0.12)" }}>
              {dirty ? <Typography variant="caption" fontWeight={700} color="primary.dark">Есть несохранённые изменения</Typography> : null}
              <AppPillButton variant="contained" disabled={busy || !canSaveResult} onClick={onSave}>Сохранить результат</AppPillButton>
            </Box>
          ) : null}
          {canRequestRecheck ? <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.5 }}><AppPillButton variant="outlined" disabled={busy} onClick={onRequestRecheck}>Перепроверить</AppPillButton></Stack> : null}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
