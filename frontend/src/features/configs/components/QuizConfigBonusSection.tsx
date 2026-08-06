import { StarRounded } from "@mui/icons-material";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import type { ProjectResource } from "../../projects/types";
import { QuizBonusRulesEditor } from "../../utilities/quizzes/components/QuizRewardsEditor";
import type { QuizConfig } from "../../utilities/quizzes/types";

interface QuizConfigBonusSectionProps {
  config: QuizConfig;
  resources: ProjectResource[];
  selectedQuestionIndex: number | null;
  disabled: boolean;
  onSelectQuestion: (questionIndex: number) => void;
  onChange: (patch: Partial<QuizConfig>) => void;
}

export default function QuizConfigBonusSection({ config, resources, selectedQuestionIndex, disabled, onSelectQuestion, onChange }: QuizConfigBonusSectionProps) {
  const questionCount = config.questionCount ?? 0;
  const selectedBonuses = selectedQuestionIndex ? config.bonusRules.filter((bonus) => bonus.questionIndex === selectedQuestionIndex) : [];

  return <Card><CardContent><Stack spacing={2}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
      <Stack spacing={0.25}><Typography variant="h5">Бонусные вопросы</Typography><Typography variant="body2" color="text.secondary">Выберите вопрос и настройте дополнительные награды за конкретные места.</Typography></Stack>
      <Chip size="small" label={`${config.bonusRules.length} ${config.bonusRules.length === 1 ? "правило" : "правил"}`} />
    </Stack>
    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "rgba(248, 250, 252, 0.66)" }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle1">Вопросы конфига</Typography><Chip size="small" label={questionCount ? `${questionCount} вопросов` : "Укажите количество"} /></Stack>
        {questionCount ? <AppResponsiveGrid columns={{ xs: 2, sm: 3, md: 5, lg: 6 }} gap={1}>
          {Array.from({ length: questionCount }, (_value, offset) => {
            const questionIndex = offset + 1;
            const bonusCount = config.bonusRules.filter((bonus) => bonus.questionIndex === questionIndex).length;
            const selected = selectedQuestionIndex === questionIndex;
            return <Box component="button" type="button" key={questionIndex} onClick={() => onSelectQuestion(questionIndex)} sx={{ minHeight: 78, p: 1.25, textAlign: "left", border: "1px solid", borderColor: selected ? "primary.main" : "divider", borderRadius: 1.5, bgcolor: selected ? "rgba(79, 70, 229, 0.08)" : "background.paper", cursor: "pointer", color: "text.primary", "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 } }}>
              <Stack spacing={0.25}><Stack direction="row" justifyContent="space-between"><Typography variant="subtitle2">Вопрос {questionIndex}</Typography>{bonusCount ? <StarRounded color="warning" fontSize="small" /> : null}</Stack><Typography variant="caption" color="text.secondary">{bonusCount ? `${bonusCount} бонусных правил` : "Без бонусов"}</Typography></Stack>
            </Box>;
          })}
        </AppResponsiveGrid> : <Typography variant="body2" color="text.secondary">Укажите количество вопросов в разделе «Основное», чтобы настроить бонусы.</Typography>}
      </Stack>
    </Box>
    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, minHeight: 240 }}>
      {selectedQuestionIndex ? <Stack spacing={1.5}><Stack direction="row" justifyContent="space-between" alignItems="center"><Stack spacing={0.25}><Chip size="small" label="Выбранный вопрос" sx={{ alignSelf: "flex-start" }} /><Typography variant="h6">Вопрос {selectedQuestionIndex}</Typography></Stack><Chip size="small" label={`${selectedBonuses.length} правил`} /></Stack><QuizBonusRulesEditor bonuses={config.bonusRules} selectedQuestionIndex={selectedQuestionIndex} resources={resources} disabled={disabled} onChange={(bonusRules) => onChange({ bonusRules })} /></Stack> : <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ minHeight: 190, textAlign: "center" }}><StarRounded color="secondary" sx={{ fontSize: 42 }} /><Typography variant="h6">Выберите вопрос</Typography><Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>После выбора здесь появятся бонусные правила для конкретных мест.</Typography></Stack>}
    </Box>
  </Stack></CardContent></Card>;
}
