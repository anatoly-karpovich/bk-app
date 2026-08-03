import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import { quizConfigsTexts } from "../../../texts/quizConfigsTexts";
import type { QuizConfig, QuizRegularRule } from "../../utilities/quizzes/types";

interface QuizConfigSelectionCardProps {
  config: QuizConfig;
  onSelect: () => void;
}

function getRegularRewardSummary(rule: QuizRegularRule | null): string {
  if (!rule) {
    return quizConfigsTexts.card.notConfigured;
  }

  return rule.mode === "all_accepted"
    ? quizConfigsTexts.card.regularRewardAllAccepted
    : quizConfigsTexts.card.regularRewardByPosition(rule.positionRewards.length);
}

export default function QuizConfigSelectionCard({ config, onSelect }: QuizConfigSelectionCardProps) {
  const summaryItems = [
    {
      label: quizConfigsTexts.card.questionCount,
      value:
        config.questionCount === null
          ? quizConfigsTexts.card.notConfigured
          : quizConfigsTexts.card.questionsValue(config.questionCount),
    },
    { label: quizConfigsTexts.card.regularRewards, value: getRegularRewardSummary(config.defaultRegularRule) },
    {
      label: quizConfigsTexts.card.bonusRewards,
      value: quizConfigsTexts.card.bonusRulesValue(config.bonusRules.length),
    },
    {
      label: quizConfigsTexts.card.messages,
      value:
        config.messageTemplates && config.answerMessageTemplates
          ? quizConfigsTexts.card.messagesConfigured
          : quizConfigsTexts.card.notConfigured,
    },
  ];
  const isReady = config.status === "ready";

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5">{config.name || quizConfigsTexts.card.untitled}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {config.description || quizConfigsTexts.card.noDescription}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 42,
              height: 42,
              display: "grid",
              placeItems: "center",
              borderRadius: 1.75,
              bgcolor: "rgba(79, 70, 229, 0.1)",
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <QuizRoundedIcon fontSize="small" />
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
          {config.isSystem ? <Chip size="small" label={quizConfigsTexts.card.system} color="secondary" /> : null}
        </Stack>

        <AppResponsiveGrid columns={{ xs: 1, sm: 2 }} gap={1} sx={{ mt: 0.75 }}>
          {summaryItems.map((item) => (
            <Box
              key={item.label}
              sx={{
                minHeight: 54,
                px: 1.25,
                py: 0.875,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.75,
                bgcolor: "rgba(248, 250, 252, 0.8)",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ mt: 0.25, overflowWrap: "anywhere" }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </AppResponsiveGrid>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={1.25}
          sx={{ mt: "auto", pt: 1.5 }}
        >
          <Typography variant="caption" color="text.secondary">
            {quizConfigsTexts.card.appliesToNewQuizzes}
          </Typography>
          <Button variant="outlined" size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={onSelect}>
            {quizConfigsTexts.card.open}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
