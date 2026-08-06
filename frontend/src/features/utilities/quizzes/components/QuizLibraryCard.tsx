import { useState, type ReactNode } from "react";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box, Card, CardContent, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import { isQuestionComplete } from "../quizEditor.helpers";
import { formatQuizDate, type QuizLibraryStatus } from "../quizLibrary.helpers";
import type { Quiz, QuizEvent } from "../types";

interface QuizLibraryCardProps {
  quiz: Quiz;
  event: QuizEvent | null;
  status: QuizLibraryStatus;
  authorLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  busy: boolean;
  onOpenQuiz: () => void;
  onOpenEvent: () => void;
  onDelete: () => void;
  onRun: () => void;
}

const statusPresentation: Record<QuizLibraryStatus, { label: string; color: string; halo: string }> = {
  ready: { label: "Готова к проведению", color: "success.main", halo: "#eaf7ee" },
  draft: { label: "Черновик", color: "warning.main", halo: "#fff6d9" },
  open: { label: "Идёт проведение", color: "secondary.main", halo: "#e0f2fe" },
  completed: { label: "Проведена", color: "grey.500", halo: "#eef1f4" },
};

export default function QuizLibraryCard({ quiz, event, status, authorLabel, canEdit, canDelete, busy, onOpenQuiz, onOpenEvent, onDelete, onRun }: QuizLibraryCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const completedCount = quiz.questions.filter(isQuestionComplete).length;
  const presentation = statusPresentation[status];
  const isEventCard = Boolean(event);
  const questionsTotal = event?.preparedQuestionsCount ?? quiz.questions.length;
  const questionsProgress = event ? event.conductedQuestionsCount : completedCount;
  const dateLabel = event?.completedAt ? `Проведена ${formatQuizDate(event.completedAt)}` : event ? `Начата ${formatQuizDate(event.createdAt)}` : `Изменена ${formatQuizDate(quiz.updatedAt)}`;
  const closeMenu = () => setMenuAnchor(null);

  return (
    <Card sx={{ height: "100%", minHeight: 286, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: status === "completed" ? "#fcfcfd" : "background.paper", transition: "border-color .18s ease, box-shadow .18s ease, transform .18s ease", border: "1px solid transparent", "&:hover": { transform: "translateY(-2px)", borderColor: "rgba(79, 70, 229, 0.38)", boxShadow: "0 18px 38px rgba(30, 40, 58, 0.12)" } }}>
      <CardContent sx={{ p: 2.5, pb: 1.75, flex: 1, display: "flex", flexDirection: "column" }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="flex-start">
          <Typography variant="h5" sx={{ minWidth: 0, lineHeight: 1.15 }} noWrap>{quiz.name || "Без названия"}</Typography>
          <IconButton aria-label={`Действия с викториной «${quiz.name || "Без названия"}»`} onClick={(menuEvent) => setMenuAnchor(menuEvent.currentTarget)} sx={{ flexShrink: 0, border: 1, borderColor: "divider", bgcolor: "background.paper" }}><MoreHorizRoundedIcon fontSize="small" /></IconButton>
        </Stack>

        <Typography variant="body2" color={quiz.description ? "text.secondary" : "text.disabled"} sx={{ mt: 1.25, minHeight: 42, fontStyle: quiz.description ? "normal" : "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {quiz.description || "Описание не добавлено."}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={1.1} sx={{ mt: 1.75, mb: 1.75 }}>
          <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: presentation.color, boxShadow: `0 0 0 5px ${presentation.halo}` }} />
          <Typography variant="body2" fontWeight={800}>{presentation.label}</Typography>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ ml: "auto", whiteSpace: "nowrap" }}>{questionsProgress}/{questionsTotal} вопросов</Typography>
        </Stack>

        <Stack direction="row" flexWrap="wrap" useFlexGap gap={1.25} sx={{ pt: 1.75, borderTop: 1, borderColor: "divider" }}>
          <CardMeta icon={<SettingsOutlinedIcon fontSize="inherit" />} label={quiz.configRulesSnapshot.configName} />
          <CardMeta icon={<PersonOutlineRoundedIcon fontSize="inherit" />} label={authorLabel} />
          <CardMeta icon={<ScheduleOutlinedIcon fontSize="inherit" />} label={dateLabel} />
        </Stack>
      </CardContent>

      <Box sx={{ minHeight: 72, px: 2.5, py: 1.25, display: "flex", justifyContent: "flex-end", alignItems: "center", borderTop: 1, borderColor: "divider", bgcolor: "rgba(248, 250, 252, 0.82)" }}>
        {status === "ready" ? <AppPillButton variant="contained" startIcon={<PlayArrowRoundedIcon />} loading={busy} onClick={onRun} sx={{ minWidth: 150 }}>Провести</AppPillButton> : status === "draft" ? <AppPillButton variant="outlined" startIcon={<EditRoundedIcon />} onClick={onOpenQuiz} sx={{ minWidth: 150 }}>Продолжить</AppPillButton> : <AppPillButton variant="outlined" startIcon={<OpenInNewRoundedIcon />} onClick={onOpenEvent} sx={{ minWidth: 170 }}>{status === "open" ? "Продолжить проведение" : "Проведение"}</AppPillButton>}
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} transformOrigin={{ horizontal: "right", vertical: "top" }} anchorOrigin={{ horizontal: "right", vertical: "bottom" }}>
        {isEventCard ? <MenuItem onClick={() => { closeMenu(); onOpenEvent(); }}><OpenInNewRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />Открыть проведение</MenuItem> : null}
        <MenuItem onClick={() => { closeMenu(); onOpenQuiz(); }}>
          {canEdit && !isEventCard ? <EditRoundedIcon fontSize="small" sx={{ mr: 1.25 }} /> : <VisibilityRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />}
          {canEdit && !isEventCard ? "Редактировать" : "Просмотреть викторину"}
        </MenuItem>
        {canDelete ? <MenuItem onClick={() => { closeMenu(); onDelete(); }} sx={{ color: "error.main" }}><DeleteOutlineRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />Удалить викторину</MenuItem> : null}
      </Menu>
    </Card>
  );
}

function CardMeta({ icon, label }: { icon: ReactNode; label: string }) {
  return <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0, maxWidth: "100%" }}><Box sx={{ width: 27, height: 27, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: 1.25, color: "text.secondary", bgcolor: "action.hover", fontSize: 14 }}>{icon}</Box><Typography variant="caption" fontWeight={700} noWrap>{label}</Typography></Stack>;
}
