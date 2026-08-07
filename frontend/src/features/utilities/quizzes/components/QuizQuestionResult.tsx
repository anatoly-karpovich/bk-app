import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Stack, Typography } from "@mui/material";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import type { ResourceDefinition } from "../../../rewards/types";
import type { QuizAward, QuizEventQuestion } from "../types";

interface QuizQuestionResultProps {
  question: QuizEventQuestion;
  resources: ResourceDefinition[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export default function QuizQuestionResult({ question, resources, expanded, onExpandedChange }: QuizQuestionResultProps) {
  if (!question.ranking.length && !question.reviewedAt) return null;
  const awardsByMessageId = new Map<string, QuizAward[]>();
  question.awards.forEach((award) => {
    const awards = awardsByMessageId.get(award.selectedMessageId) ?? [];
    awards.push(award);
    awardsByMessageId.set(award.selectedMessageId, awards);
  });

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => onExpandedChange(next)}
      sx={{ borderRadius: "20px !important", overflow: "hidden", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)", "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: { xs: 2, sm: 2.75 }, py: 0.5, "& .MuiAccordionSummary-content": { my: 1.5 } }}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h5">Результат вопроса</Typography>
            <Chip size="small" label={question.reviewedAt ? "Проверен" : "Предварительный рейтинг"} color={question.reviewedAt ? "success" : "warning"} />
          </Stack>
          {question.reviewedAt ? <Typography variant="body2" color="text.secondary">Проведён #{question.conductedOrder} · Проверено {new Date(question.reviewedAt).toLocaleString("ru-RU")}</Typography> : null}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 2, sm: 2.75 }, pt: 0, pb: 2.75, borderTop: 1, borderColor: "divider" }}>
        <Stack spacing={1.25} sx={{ pt: 2 }}>
          {question.ranking.length ? question.ranking.map((answer) => {
            const awards = awardsByMessageId.get(answer.selectedMessageId) ?? [];
            const regularReward = formatResourceAmounts(awards.filter((award) => award.source.kind !== "bonus_position").flatMap((award) => award.rewards), resources);
            const bonusAwards = awards.filter((award) => award.source.kind === "bonus_position");
            const bonusReward = formatResourceAmounts(bonusAwards.flatMap((award) => award.rewards), resources, { showPlus: true });
            const reassignedBonusPositions = bonusAwards
              .map((award) => award.source.bonusRulePosition)
              .filter((position): position is number => position !== null && position !== undefined && position !== answer.position);
            const bonusLabel = reassignedBonusPositions.length
              ? `Бонус ${bonusReward} · за ${reassignedBonusPositions.map((position) => `${position}-е`).join(", ")} место → ${answer.position}-е место`
              : `Бонус ${bonusReward}`;
            const hasBonus = Boolean(bonusReward);
            return (
              <Box
                key={answer.selectedMessageId}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "34px minmax(0, 1fr)", sm: "34px minmax(0, 1fr) auto" },
                  alignItems: "center",
                  gap: 1.25,
                  px: 1.75,
                  py: 1.25,
                  border: 1,
                  borderColor: hasBonus ? "#efc658" : "divider",
                  borderRadius: 2,
                  bgcolor: hasBonus ? "#fffaf0" : "background.paper",
                }}
              >
                <Box sx={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: hasBonus ? "#ffe69a" : "#eef1f4", fontSize: 12, fontWeight: 800 }}>{answer.position}</Box>
                <Typography fontWeight={700}>{answer.playerName}</Typography>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ gridColumn: { xs: "2", sm: "auto" }, justifyContent: { sm: "flex-end" } }}>
                  {regularReward ? <Typography variant="body2" fontWeight={700}>{regularReward}</Typography> : null}
                  {bonusReward ? <Chip size="small" label={bonusLabel} sx={{ bgcolor: "#ffedb6", color: "#7f5a00", fontWeight: 700 }} /> : null}
                </Stack>
              </Box>
            );
          }) : <Typography variant="body2" color="text.secondary">Ни один ответ не включён в рейтинг.</Typography>}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
