import { useState } from "react";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Box, Grid, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import type { Project } from "../../projects/types";
import type { QuizConfig } from "../../utilities/quizzes/types";
import type { ConfigSection, QuizConfigSectionId } from "../types";
import { hasReward } from "../quizConfigEditor.helpers";
import ConfigEditorWorkspaceHeader from "./ConfigEditorWorkspaceHeader";
import ConfigSectionNav from "./ConfigSectionNav";
import QuizConfigBonusSection from "./QuizConfigBonusSection";
import QuizConfigDescriptionSection from "./QuizConfigDescriptionSection";
import QuizConfigMessagesSection from "./QuizConfigMessagesSection";
import QuizConfigRewardsSection from "./QuizConfigRewardsSection";

const sections: readonly ConfigSection<QuizConfigSectionId>[] = [
  { id: "general", icon: <ArticleRoundedIcon fontSize="small" />, label: "Основное", description: "Название и параметры" },
  { id: "rewards", icon: <EmojiEventsRoundedIcon fontSize="small" />, label: "Обычная награда", description: "За правильные ответы" },
  { id: "bonus", icon: <StarRoundedIcon fontSize="small" />, label: "Бонусные вопросы", description: "Вопросы и места" },
  { id: "messages", icon: <ForumRoundedIcon fontSize="small" />, label: "Сообщения", description: "Шаблоны для чата" },
];

const workspaceCopy: Record<QuizConfigSectionId, { title: string; description: string }> = {
  general: { title: "Основные сведения", description: "Название, описание и количество вопросов." },
  rewards: { title: "Обычная награда", description: "Правило награды за правильные ответы и переопределения." },
  bonus: { title: "Бонусные вопросы", description: "Дополнительные награды за конкретные вопросы и места." },
  messages: { title: "Шаблоны сообщений", description: "Тексты вопросов и правильных ответов для публикации в чате." },
};

interface QuizConfigEditorWorkspaceProps {
  source: QuizConfig;
  draft: QuizConfig;
  selectedProject: Project;
  changedSections: readonly QuizConfigSectionId[];
  requiredFields: readonly string[];
  disabled: boolean;
  isSaving: boolean;
  saveLabel: string;
  saveStateText: string;
  canReset: boolean;
  onChange: (patch: Partial<QuizConfig>) => void;
  onSave: () => void;
  onReset: () => void;
}

export default function QuizConfigEditorWorkspace({ source, draft, selectedProject, changedSections, requiredFields, disabled, isSaving, saveLabel, saveStateText, canReset, onChange, onSave, onReset }: QuizConfigEditorWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<QuizConfigSectionId>("general");
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const warningSections: QuizConfigSectionId[] = [
    ...(!draft.name.trim() || !draft.questionCount ? ["general" as const] : []),
    ...(!hasReward(draft.defaultRegularRule) ? ["rewards" as const] : []),
    ...(!draft.messageTemplates?.defaultTemplate.template.trim() || !draft.answerMessageTemplates?.defaultTemplate.template.trim() ? ["messages" as const] : []),
  ];
  const readySections: QuizConfigSectionId[] = ["bonus"];
  const active = workspaceCopy[activeSection];

  return <Grid container spacing={3} alignItems="flex-start">
    <Grid item xs={12} lg={4} xl={3}>
      <Box sx={{ position: { lg: "sticky" }, top: { lg: 104 } }}>
        <ConfigSectionNav<QuizConfigSectionId> heading="Разделы" description="Настройки конфига" changedHint="Изменённые разделы отмечаются фиолетовым индикатором. Конфиг сохраняется целиком." sections={sections} activeSection={activeSection} changedSections={changedSections} warningSections={warningSections} readySections={readySections} onSelect={setActiveSection} />
      </Box>
    </Grid>

    <Grid item xs={12} lg={8} xl={9}>
      <Stack spacing={2.25}>
        <ConfigEditorWorkspaceHeader title={active.title} description={active.description} resources={selectedProject.resources} />
        {activeSection === "general" ? <QuizConfigDescriptionSection source={source} draft={draft} disabled={disabled} onChange={onChange} /> : null}
        {activeSection === "rewards" ? <QuizConfigRewardsSection config={draft} resources={selectedProject.resources} disabled={disabled} onChange={onChange} /> : null}
        {activeSection === "bonus" ? <QuizConfigBonusSection config={draft} resources={selectedProject.resources} selectedQuestionIndex={selectedQuestionIndex} disabled={disabled} onSelectQuestion={setSelectedQuestionIndex} onChange={onChange} /> : null}
        {activeSection === "messages" ? <QuizConfigMessagesSection config={draft} disabled={disabled} onChange={onChange} /> : null}

        <Box sx={{ position: "sticky", bottom: 16, zIndex: 5, p: 1.25, border: "1px solid", borderColor: "primary.light", borderRadius: 99, bgcolor: "rgba(255,255,255,0.96)", boxShadow: "0 14px 28px rgba(15, 23, 42, 0.12)", backdropFilter: "blur(12px)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: requiredFields.length ? "warning.main" : "success.main" }} /><Typography variant="body2" fontWeight={700}>{saveStateText}</Typography></Stack>
            <Stack direction="row" spacing={1} alignItems="center"><AppPillButton variant="text" color="inherit" startIcon={<RefreshRoundedIcon />} disabled={disabled || !canReset} onClick={onReset}>Сбросить</AppPillButton><AppPillButton variant="contained" startIcon={<SaveRoundedIcon />} disabled={disabled || isSaving || !canReset || Boolean(requiredFields.length)} loading={isSaving} onClick={onSave}>{saveLabel}</AppPillButton></Stack>
          </Stack>
        </Box>
      </Stack>
    </Grid>
  </Grid>;
}
