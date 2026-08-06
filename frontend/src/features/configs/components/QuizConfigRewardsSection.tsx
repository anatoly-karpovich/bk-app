import { Card, CardContent } from "@mui/material";
import type { ProjectResource } from "../../projects/types";
import { QuizRegularRewardsEditor } from "../../utilities/quizzes/components/QuizRewardsEditor";
import type { QuizConfig } from "../../utilities/quizzes/types";

interface QuizConfigRewardsSectionProps {
  config: QuizConfig;
  resources: ProjectResource[];
  disabled: boolean;
  onChange: (patch: Partial<QuizConfig>) => void;
}

export default function QuizConfigRewardsSection({ config, resources, disabled, onChange }: QuizConfigRewardsSectionProps) {
  return <Card><CardContent>
    <QuizRegularRewardsEditor
      questionCount={config.questionCount}
      resources={resources}
      defaultRule={config.defaultRegularRule}
      overrides={config.regularRewardOverrides}
      disabled={disabled}
      onChange={(next) => onChange({ defaultRegularRule: next.defaultRule, regularRewardOverrides: next.overrides })}
    />
  </CardContent></Card>;
}
