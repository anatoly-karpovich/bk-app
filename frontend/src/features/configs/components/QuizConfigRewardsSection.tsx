import { Card, CardContent, Stack, Typography } from "@mui/material";
import { quizConfigsTexts } from "../../../texts/quizConfigsTexts";
import type { ProjectResource } from "../../projects/types";
import QuizRewardsEditor from "../../utilities/quizzes/components/QuizRewardsEditor";
import type { QuizConfig } from "../../utilities/quizzes/types";

interface QuizConfigRewardsSectionProps {
  config: QuizConfig;
  resources: ProjectResource[];
  disabled: boolean;
  onChange: (patch: Partial<QuizConfig>) => void;
}

export default function QuizConfigRewardsSection({ config, resources, disabled, onChange }: QuizConfigRewardsSectionProps) {
  const texts = quizConfigsTexts.editor.rewards;

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="h5">{texts.title}</Typography>
            <Typography variant="body2" color="text.secondary">{texts.description}</Typography>
          </Stack>
          <QuizRewardsEditor
            questionCount={config.questionCount}
            resources={resources}
            defaultRule={config.defaultRegularRule}
            overrides={config.regularRewardOverrides}
            bonuses={config.bonusRules}
            disabled={disabled}
            onChange={(next) => onChange({
              defaultRegularRule: next.defaultRule,
              regularRewardOverrides: next.overrides,
              bonusRules: next.bonuses,
            })}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
