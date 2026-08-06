import { useMemo, useState } from "react";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Grid, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import { quizConfigsTexts } from "../../texts/quizConfigsTexts";
import type { Project } from "../projects/types";
import type { QuizConfig, QuizRegularRule } from "../utilities/quizzes/types";
import { quizConfigsApi } from "./api/quizConfigs.client";
import ConfigEditorWorkspaceHeader from "./components/ConfigEditorWorkspaceHeader";
import ConfigSectionNav from "./components/ConfigSectionNav";
import QuizConfigDescriptionSection from "./components/QuizConfigDescriptionSection";
import QuizConfigMessagesSection from "./components/QuizConfigMessagesSection";
import QuizConfigRewardsSection from "./components/QuizConfigRewardsSection";
import type { ConfigSection, QuizConfigSectionId } from "./types";

const sections: readonly ConfigSection<QuizConfigSectionId>[] = [
  { id: "description", icon: <ArticleRoundedIcon fontSize="small" />, ...quizConfigsTexts.editor.sections.details.description },
  { id: "rewards", icon: <EmojiEventsRoundedIcon fontSize="small" />, ...quizConfigsTexts.editor.sections.details.rewards },
  { id: "messages", icon: <ForumRoundedIcon fontSize="small" />, ...quizConfigsTexts.editor.sections.details.messages },
];

type QuizConfigCreateInput = Pick<
  QuizConfig,
  "name" | "description" | "questionCount" | "defaultRegularRule" | "regularRewardOverrides" | "bonusRules" | "messageTemplates" | "answerMessageTemplates"
>;

function createDraft(): QuizConfig {
  return {
    id: "",
    name: "",
    description: "",
    status: "draft",
    questionCount: null,
    defaultRegularRule: null,
    regularRewardOverrides: [],
    bonusRules: [],
    messageTemplates: null,
    answerMessageTemplates: null,
    isSystem: false,
    createdByUserId: "",
    updatedByUserId: "",
    createdAt: "",
    updatedAt: "",
    validationIssues: [],
  };
}

function hasReward(rule: QuizRegularRule | null): boolean {
  if (!rule) {
    return false;
  }

  return rule.mode === "all_accepted"
    ? rule.rewardPool.rewards.some((reward) => reward.amount > 0)
    : rule.positionRewards.some((entry) => entry.rewardPool.rewards.some((reward) => reward.amount > 0));
}

function getRequiredFields(draft: QuizConfig): string[] {
  const texts = quizConfigsTexts.create.required;
  const missing: string[] = [];

  if (!draft.name.trim()) missing.push(texts.name);
  if (!Number.isSafeInteger(draft.questionCount) || (draft.questionCount ?? 0) < 1) missing.push(texts.questionCount);
  if (!draft.defaultRegularRule) missing.push(texts.regularReward);
  else if (!hasReward(draft.defaultRegularRule)) missing.push(texts.regularRewardPool);
  if (!draft.messageTemplates?.defaultTemplate.template.trim()) missing.push(texts.questionTemplate);
  if (!draft.answerMessageTemplates?.defaultTemplate.template.trim()) missing.push(texts.answerTemplate);

  return missing;
}

function toCreateInput(draft: QuizConfig): QuizConfigCreateInput {
  const {
    name,
    description,
    questionCount,
    defaultRegularRule,
    regularRewardOverrides,
    bonusRules,
    messageTemplates,
    answerMessageTemplates,
  } = draft;

  return {
    name,
    description,
    questionCount,
    defaultRegularRule,
    regularRewardOverrides,
    bonusRules,
    messageTemplates,
    answerMessageTemplates,
  };
}

interface QuizConfigCreatePageProps {
  selectedProject: Project | null;
}

export default function QuizConfigCreatePage({ selectedProject }: QuizConfigCreatePageProps) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<QuizConfig>(createDraft);
  const [activeSection, setActiveSection] = useState<QuizConfigSectionId>("description");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiredFields = useMemo(() => getRequiredFields(draft), [draft]);
  const activeSectionDetails = quizConfigsTexts.editor.sections.details[activeSection];

  if (!selectedProject) {
    return <Alert severity="warning">{quizConfigsTexts.create.alerts.projectRequired}</Alert>;
  }

  const updateDraft = (patch: Partial<QuizConfig>) => setDraft((current) => ({ ...current, ...patch }));

  const save = async () => {
    if (isSaving || requiredFields.length) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const created = await quizConfigsApi.create(selectedProject.id, toCreateInput(draft));
      navigate(`/configs/quizzes/${encodeURIComponent(created.id)}`, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : quizConfigsTexts.create.alerts.createFailed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12}>
        <GamePageHeader
          breadcrumbPath="/configs/quizzes"
          breadcrumbItems={[{ label: quizConfigsTexts.create.title }]}
          title={quizConfigsTexts.create.title}
          description={quizConfigsTexts.create.description}
          chips={[
            { label: quizConfigsTexts.editor.configChip },
            { label: quizConfigsTexts.page.projectChip(selectedProject.name), color: "secondary" },
          ]}
          actions={[
            {
              key: "create",
              label: quizConfigsTexts.create.create,
              icon: <SaveRoundedIcon />,
              onClick: () => void save(),
              disabled: isSaving || Boolean(requiredFields.length),
              loading: isSaving,
              variant: "contained",
            },
          ]}
        />
      </Grid>

      {error ? <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid> : null}
      {requiredFields.length ? (
        <Grid item xs={12}>
          <Alert severity="warning">
            {quizConfigsTexts.create.requiredFields}
            <Stack component="ul" sx={{ m: 0, pl: 2 }}>
              {requiredFields.map((field) => <li key={field}>{field}</li>)}
            </Stack>
          </Alert>
        </Grid>
      ) : null}

      <Grid item xs={12} lg={4} xl={3}>
        <ConfigSectionNav<QuizConfigSectionId>
          heading={quizConfigsTexts.editor.sections.heading}
          description={quizConfigsTexts.editor.sections.description}
          changedHint={quizConfigsTexts.editor.sections.changedHint}
          sections={sections}
          activeSection={activeSection}
          changedSections={[]}
          onSelect={setActiveSection}
        />
      </Grid>

      <Grid item xs={12} lg={8} xl={9}>
        <Stack spacing={2.25}>
          <ConfigEditorWorkspaceHeader
            title={activeSectionDetails.title}
            description={activeSectionDetails.details}
            resources={selectedProject.resources}
          />

          {activeSection === "description" ? (
            <QuizConfigDescriptionSection source={draft} draft={draft} disabled={isSaving} onChange={updateDraft} />
          ) : null}
          {activeSection === "rewards" ? (
            <QuizConfigRewardsSection config={draft} resources={selectedProject.resources} disabled={isSaving} onChange={updateDraft} />
          ) : null}
          {activeSection === "messages" ? (
            <QuizConfigMessagesSection config={draft} disabled={isSaving} onChange={updateDraft} />
          ) : null}
        </Stack>
      </Grid>
    </Grid>
  );
}
