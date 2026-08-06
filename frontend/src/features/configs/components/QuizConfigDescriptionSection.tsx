import { Alert, Card, CardContent, Stack, Typography } from "@mui/material";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import AppTextInput from "../../../components/ui/AppTextInput";
import { quizConfigsTexts } from "../../../texts/quizConfigsTexts";
import type { QuizConfig } from "../../utilities/quizzes/types";
import ConfigSummaryCard from "./ConfigSummaryCard";

interface QuizConfigDescriptionSectionProps {
  source: QuizConfig;
  draft: QuizConfig;
  disabled: boolean;
  onChange: (patch: Partial<QuizConfig>) => void;
}

export default function QuizConfigDescriptionSection({ source, draft, disabled, onChange }: QuizConfigDescriptionSectionProps) {
  const texts = quizConfigsTexts.editor.description;
  const isNameMissing = !draft.name.trim();
  const isQuestionCountMissing = !Number.isSafeInteger(draft.questionCount) || (draft.questionCount ?? 0) < 1;
  const summaryItems = [
    { label: "Конфиг", value: draft.name.trim() || quizConfigsTexts.card.untitled },
    { label: texts.questionCount, value: isQuestionCountMissing ? quizConfigsTexts.card.notConfigured : quizConfigsTexts.card.questionsValue(draft.questionCount ?? 0) },
    { label: texts.status, value: draft.status === "ready" ? quizConfigsTexts.card.ready : quizConfigsTexts.card.draft },
  ];

  return (
    <Stack spacing={2.25}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack spacing={0.25}>
              <Typography variant="h5">{texts.title}</Typography>
              <Typography variant="body2" color="text.secondary">{texts.details}</Typography>
            </Stack>
            <AppResponsiveGrid columns={{ xs: 1, md: 2 }}>
              <AppTextInput fullWidth required label={texts.name} value={draft.name} changed={draft.name !== source.name} error={isNameMissing} disabled={disabled} placeholder="Например, Стандартный" onChange={(event) => onChange({ name: event.target.value })} />
              <AppTextInput fullWidth label={texts.configDescription} value={draft.description} changed={draft.description !== source.description} disabled={disabled} placeholder="Коротко опишите назначение конфига" onChange={(event) => onChange({ description: event.target.value })} />
              <AppTextInput fullWidth required type="number" label={texts.questionCount} value={draft.questionCount ?? ""} changed={draft.questionCount !== source.questionCount} error={isQuestionCountMissing} disabled={disabled} inputProps={{ min: 1, step: 1 }} placeholder="10" onChange={(event) => onChange({ questionCount: event.target.value ? Number(event.target.value) : null })} />
              <Card variant="outlined" sx={{ bgcolor: "rgba(248, 250, 252, 0.9)", boxShadow: "none" }}>
                <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                  <Typography variant="caption" color="text.secondary">Статус конфига</Typography>
                  <Typography variant="body2" fontWeight={700}>{draft.status === "ready" ? "Готов" : "Черновик — есть незаполненные обязательные поля"}</Typography>
                </CardContent>
              </Card>
            </AppResponsiveGrid>
            <Alert severity="info" icon={false} sx={{ py: 0.25 }}>Статус вручную не выбирается: пока обязательные поля не заполнены, конфиг считается черновиком; после заполнения — готовым.</Alert>
          </Stack>
        </CardContent>
      </Card>

      <ConfigSummaryCard title={texts.summaryTitle} description="Быстрый просмотр ключевых параметров конфига." items={summaryItems} />

      {draft.validationIssues.length ? (
        <Alert severity="warning">
          <Stack component="ul" sx={{ m: 0, pl: 2 }}>
            {draft.validationIssues.map((issue, index) => <li key={`${issue.path}-${index}`}>{issue.message}</li>)}
          </Stack>
        </Alert>
      ) : null}
    </Stack>
  );
}
