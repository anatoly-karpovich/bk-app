import { useMemo, useState } from "react";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, CircularProgress, Grid, Stack } from "@mui/material";
import { useParams } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import { quizConfigsTexts } from "../../texts/quizConfigsTexts";
import { useAuth } from "../auth/useAuth";
import type { Project } from "../projects/types";
import QuizConfigDescriptionSection from "./components/QuizConfigDescriptionSection";
import QuizConfigMessagesSection from "./components/QuizConfigMessagesSection";
import QuizConfigRewardsSection from "./components/QuizConfigRewardsSection";
import ConfigEditorWorkspaceHeader from "./components/ConfigEditorWorkspaceHeader";
import ConfigSectionNav from "./components/ConfigSectionNav";
import { useQuizConfigEditor } from "./hooks/useQuizConfigEditor";
import type { ConfigSection, QuizConfigSectionId } from "./types";

function isSameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getChangedSections(source: { name: string; description: string; questionCount: number | null; defaultRegularRule: unknown; regularRewardOverrides: unknown; bonusRules: unknown; messageTemplates: unknown; answerMessageTemplates: unknown } | null, draft: { name: string; description: string; questionCount: number | null; defaultRegularRule: unknown; regularRewardOverrides: unknown; bonusRules: unknown; messageTemplates: unknown; answerMessageTemplates: unknown } | null): QuizConfigSectionId[] {
  if (!source || !draft) {
    return [];
  }

  const changes: Array<[QuizConfigSectionId, unknown, unknown]> = [
    ["description", { name: source.name, description: source.description, questionCount: source.questionCount }, { name: draft.name, description: draft.description, questionCount: draft.questionCount }],
    ["rewards", { defaultRegularRule: source.defaultRegularRule, regularRewardOverrides: source.regularRewardOverrides, bonusRules: source.bonusRules }, { defaultRegularRule: draft.defaultRegularRule, regularRewardOverrides: draft.regularRewardOverrides, bonusRules: draft.bonusRules }],
    ["messages", { messageTemplates: source.messageTemplates, answerMessageTemplates: source.answerMessageTemplates }, { messageTemplates: draft.messageTemplates, answerMessageTemplates: draft.answerMessageTemplates }],
  ];

  return changes.flatMap(([section, original, current]) => (isSameValue(original, current) ? [] : [section]));
}

const sections: readonly ConfigSection<QuizConfigSectionId>[] = [
  { id: "description", icon: <ArticleRoundedIcon fontSize="small" />, ...quizConfigsTexts.editor.sections.details.description },
  { id: "rewards", icon: <EmojiEventsRoundedIcon fontSize="small" />, ...quizConfigsTexts.editor.sections.details.rewards },
  { id: "messages", icon: <ForumRoundedIcon fontSize="small" />, ...quizConfigsTexts.editor.sections.details.messages },
];

interface QuizConfigPageProps {
  selectedProject: Project | null;
}

export default function QuizConfigPage({ selectedProject }: QuizConfigPageProps) {
  const { configId } = useParams<{ configId: string }>();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<QuizConfigSectionId>("description");
  const { source, draft, error, isLoading, isSaving, actions } = useQuizConfigEditor(selectedProject, configId, quizConfigsTexts.editor.alerts);
  const changedSections = useMemo(() => getChangedSections(source, draft), [draft, source]);

  if (!selectedProject) {
    return <Alert severity="warning">{quizConfigsTexts.editor.alerts.projectRequired}</Alert>;
  }

  if (isLoading) {
    return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!source || !draft) {
    return <Alert severity="warning">{quizConfigsTexts.editor.alerts.notFound}</Alert>;
  }

  const activeSectionDetails = quizConfigsTexts.editor.sections.details[activeSection];
  const canEdit = user?.role === "admin" || (!source.isSystem && source.createdByUserId === user?.id);
  const editorDisabled = isSaving || !canEdit;

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12}>
        <GamePageHeader
          breadcrumbPath="/configs/quizzes"
          breadcrumbItems={[
            { label: draft.name || quizConfigsTexts.card.untitled },
          ]}
          title={draft.name || quizConfigsTexts.card.untitled}
          description={quizConfigsTexts.editor.pageDescription}
          chips={[
            { label: quizConfigsTexts.editor.configChip },
            { label: quizConfigsTexts.page.projectChip(selectedProject.name), color: "secondary" },
            { label: quizConfigsTexts.editor.changesChip(changedSections.length), color: changedSections.length ? "warning" : "default" },
          ]}
          actions={canEdit ? [
            {
              key: "save",
              label: quizConfigsTexts.editor.save,
              icon: <SaveRoundedIcon />,
              onClick: () => void actions.save(),
              disabled: isSaving || !changedSections.length,
              loading: isSaving,
              variant: "contained",
            },
            {
              key: "reset",
              label: quizConfigsTexts.editor.reset,
              icon: <RefreshRoundedIcon />,
              onClick: actions.reset,
              disabled: isSaving || !changedSections.length,
              variant: "text",
              color: "inherit",
            },
          ] : []}
        />
      </Grid>

      {!canEdit ? <Grid item xs={12}><Alert severity="info">{quizConfigsTexts.editor.alerts.viewOnly}</Alert></Grid> : null}

      <Grid item xs={12} lg={4} xl={3}>
        <ConfigSectionNav<QuizConfigSectionId>
          heading={quizConfigsTexts.editor.sections.heading}
          description={quizConfigsTexts.editor.sections.description}
          changedHint={quizConfigsTexts.editor.sections.changedHint}
          sections={sections}
          activeSection={activeSection}
          changedSections={changedSections}
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
            <QuizConfigDescriptionSection source={source} draft={draft} disabled={editorDisabled} onChange={actions.updateDraft} />
          ) : null}
          {activeSection === "rewards" ? (
            <QuizConfigRewardsSection config={draft} resources={selectedProject.resources} disabled={editorDisabled} onChange={actions.updateDraft} />
          ) : null}
          {activeSection === "messages" ? (
            <QuizConfigMessagesSection config={draft} disabled={editorDisabled} onChange={actions.updateDraft} />
          ) : null}
        </Stack>
      </Grid>
    </Grid>
  );
}
