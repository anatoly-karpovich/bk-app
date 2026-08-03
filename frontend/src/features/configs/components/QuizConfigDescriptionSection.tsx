import { Alert, Stack } from "@mui/material";
import AppTextInput from "../../../components/ui/AppTextInput";
import { quizConfigsTexts } from "../../../texts/quizConfigsTexts";
import type { QuizConfig } from "../../utilities/quizzes/types";
import ConfigGeneralSection from "./ConfigGeneralSection";
import ConfigSummaryCard from "./ConfigSummaryCard";

interface QuizConfigDescriptionSectionProps {
  source: QuizConfig;
  draft: QuizConfig;
  disabled: boolean;
  onChange: (patch: Partial<QuizConfig>) => void;
}

export default function QuizConfigDescriptionSection({ source, draft, disabled, onChange }: QuizConfigDescriptionSectionProps) {
  const texts = quizConfigsTexts.editor.description;
  const summaryItems = [
    { label: texts.questionCount, value: draft.questionCount === null ? quizConfigsTexts.card.notConfigured : quizConfigsTexts.card.questionsValue(draft.questionCount) },
    { label: texts.status, value: draft.status === "ready" ? quizConfigsTexts.card.ready : quizConfigsTexts.card.draft },
  ];

  return (
    <Stack spacing={2.25}>
      <ConfigGeneralSection
        title={texts.title}
        description={texts.details}
        nameLabel={texts.name}
        descriptionLabel={texts.configDescription}
        source={source}
        draft={draft}
        disabled={disabled}
        onChange={onChange}
      >
        <AppTextInput
          fullWidth
          type="number"
          label={texts.questionCount}
          value={draft.questionCount ?? ""}
          changed={draft.questionCount !== source.questionCount}
          disabled={disabled}
          inputProps={{ min: 1, step: 1 }}
          onChange={(event) => onChange({ questionCount: event.target.value ? Number(event.target.value) : null })}
        />
      </ConfigGeneralSection>

      <ConfigSummaryCard title={texts.summaryTitle} description={texts.summaryDescription} items={summaryItems} />

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
