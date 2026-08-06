import { useState } from "react";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import { formatResourceAmounts } from "../../rewards/resourceAmounts";
import { quizConfigsTexts } from "../../../texts/quizConfigsTexts";
import type { ProjectResource } from "../../projects/types";
import type { QuizConfig, QuizRegularRule } from "../../utilities/quizzes/types";

interface QuizConfigSelectionCardProps {
  config: QuizConfig;
  resources: readonly ProjectResource[];
  authorLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function getRegularRewardSummary(rule: QuizRegularRule | null): string {
  if (!rule) return quizConfigsTexts.card.notConfigured;
  if (rule.mode === "all_accepted") return quizConfigsTexts.card.regularRewardAllAccepted;
  return quizConfigsTexts.card.regularRewardByPosition(rule.positionRewards.length);
}

function getBaseRewardSummary(
  rule: QuizRegularRule | null,
  resources: readonly ProjectResource[],
): { label: string; description: string; amount: string } {
  if (!rule) {
    return {
      label: quizConfigsTexts.card.baseReward,
      description: quizConfigsTexts.card.incompleteRules,
      amount: quizConfigsTexts.card.rewardNotConfigured,
    };
  }

  if (rule.mode === "all_accepted") {
    return {
      label: quizConfigsTexts.card.baseReward,
      description: quizConfigsTexts.card.rewardPerCorrectAnswer,
      amount: formatResourceAmounts(rule.rewardPool.rewards, resources) || quizConfigsTexts.card.rewardNotConfigured,
    };
  }

  return {
    label: quizConfigsTexts.card.baseRewards,
    description: quizConfigsTexts.card.positionRewards(rule.positionRewards.length),
    amount: rule.positionRewards
      .map((entry) => formatResourceAmounts(entry.rewardPool.rewards, resources))
      .filter(Boolean)
      .join(" / ") || quizConfigsTexts.card.rewardNotConfigured,
  };
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return quizConfigsTexts.card.unknownDate;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

export default function QuizConfigSelectionCard({
  config,
  resources,
  authorLabel,
  canEdit,
  canDelete,
  onSelect,
  onDelete,
}: QuizConfigSelectionCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const isReady = config.status === "ready";
  const validationIssue = config.validationIssues[0];
  const baseReward = getBaseRewardSummary(config.defaultRegularRule, resources);
  const summaryItems = [
    {
      label: quizConfigsTexts.card.questionCount,
      value:
        config.questionCount === null
          ? quizConfigsTexts.card.notConfigured
          : quizConfigsTexts.card.questionsValue(config.questionCount),
    },
    { label: quizConfigsTexts.card.regularRewards, value: getRegularRewardSummary(config.defaultRegularRule) },
    { label: baseReward.label, value: baseReward.description, amount: baseReward.amount, full: true },
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

  const closeMenu = () => setMenuAnchor(null);

  return (
    <Card
      sx={{
        height: "100%",
        minHeight: 390,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid",
        borderColor: validationIssue ? "error.light" : config.status === "draft" ? "warning.light" : "transparent",
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: validationIssue ? "error.main" : "rgba(79, 70, 229, 0.45)",
          boxShadow: "0 18px 38px rgba(15, 23, 42, 0.12)",
        },
      }}
    >
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" noWrap>
              {config.name || quizConfigsTexts.card.untitled}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              {config.isSystem ? <Chip size="small" label={quizConfigsTexts.card.system} color="secondary" /> : null}
              <Chip size="small" label={isReady ? quizConfigsTexts.card.ready : quizConfigsTexts.card.draft} color={isReady ? "success" : "warning"} />
            </Stack>
          </Box>

          <Tooltip title={quizConfigsTexts.card.menuAriaLabel}>
            <IconButton
              aria-label={quizConfigsTexts.card.menuAriaLabel}
              aria-controls={menuAnchor ? `quiz-config-menu-${config.id}` : undefined}
              aria-haspopup="true"
              aria-expanded={Boolean(menuAnchor)}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, flexShrink: 0 }}
            >
              <MoreVertRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1.25, minHeight: 40, display: "-webkit-box", overflow: "hidden", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
        >
          {config.description || quizConfigsTexts.card.noDescription}
        </Typography>

        <AppResponsiveGrid columns={{ xs: 1, sm: 2 }} gap={1} sx={{ mt: 1.75 }}>
          {summaryItems.map((item) => (
            <Box
              key={item.label}
              sx={{
                gridColumn: item.full ? { xs: "auto", sm: "1 / -1" } : undefined,
                minHeight: 66,
                px: 1.5,
                py: 1.125,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "rgba(248, 250, 252, 0.82)",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="baseline">
                <Typography variant="body2" fontWeight={700} sx={{ mt: 0.375, overflowWrap: "anywhere" }}>
                  {item.value}
                </Typography>
                {item.amount ? (
                  <Typography variant="body2" color="primary.main" fontWeight={700} sx={{ mt: 0.375, textAlign: "right", whiteSpace: "nowrap" }}>
                    {item.amount}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          ))}
        </AppResponsiveGrid>

        {validationIssue ? (
          <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1.5, px: 1.25, py: 1, borderRadius: 1.75, bgcolor: "rgba(185, 28, 28, 0.08)", color: "error.dark" }}>
            <WarningAmberRoundedIcon fontSize="small" sx={{ mt: 0.1 }} />
            <Typography variant="caption" fontWeight={700}>{validationIssue.message}</Typography>
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: "auto", pt: 1.75, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <PersonOutlineRoundedIcon fontSize="small" color="action" />
            <Typography variant="caption" fontWeight={700} noWrap>{authorLabel}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <ScheduleRoundedIcon fontSize="small" color="action" />
            <Typography variant="caption" fontWeight={700}>{quizConfigsTexts.card.updatedAt(formatUpdatedAt(config.updatedAt))}</Typography>
          </Stack>
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid", borderColor: "divider", bgcolor: "rgba(248, 250, 252, 0.75)", justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary">
          {config.isSystem ? quizConfigsTexts.card.systemConfig : quizConfigsTexts.card.personalConfig}
        </Typography>
        <AppPillButton size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={onSelect}>
          {canEdit ? quizConfigsTexts.card.edit : quizConfigsTexts.card.view}
        </AppPillButton>
      </CardActions>

      <Menu
        id={`quiz-config-menu-${config.id}`}
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => { closeMenu(); onSelect(); }}>
          <ListItemIcon><EditRoundedIcon fontSize="small" /></ListItemIcon>
          {canEdit ? quizConfigsTexts.card.edit : quizConfigsTexts.card.view}
        </MenuItem>
        <Tooltip title={quizConfigsTexts.card.cloneUnavailable} placement="left">
          <span>
            <MenuItem disabled>
              <ListItemIcon><ContentCopyRoundedIcon fontSize="small" /></ListItemIcon>
              {quizConfigsTexts.card.clone}
            </MenuItem>
          </span>
        </Tooltip>
        <MenuItem
          disabled={!canDelete}
          onClick={() => { closeMenu(); onDelete(); }}
          sx={{ color: "error.main", "&.Mui-disabled": { color: "text.disabled" } }}
        >
          <ListItemIcon sx={{ color: "inherit" }}><DeleteOutlineRoundedIcon fontSize="small" /></ListItemIcon>
          {quizConfigsTexts.card.delete}
        </MenuItem>
      </Menu>
    </Card>
  );
}
