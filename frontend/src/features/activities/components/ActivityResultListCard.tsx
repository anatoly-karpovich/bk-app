import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DirectionsBoatRoundedIcon from "@mui/icons-material/DirectionsBoatRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import AppChip from "../../../components/ui/AppChip";
import type { ActivityResultListItem } from "../types";

interface ActivityResultListCardProps {
  activity: ActivityResultListItem;
  typeLabel: string;
  busy: boolean;
  onView: () => void;
  onOpen: () => void;
  onDelete: () => void;
}

function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function getActivityIcon(type: string): ReactNode {
  switch (type) {
    case "memes":
      return <AutoAwesomeRoundedIcon fontSize="small" />;
    case "forum_quiz":
    case "quiz":
      return <QuizRoundedIcon fontSize="small" />;
    case "tournament":
      return <EmojiEventsRoundedIcon fontSize="small" />;
    case "journey":
      return <MapRoundedIcon fontSize="small" />;
    case "battleships":
      return <DirectionsBoatRoundedIcon fontSize="small" />;
    case "lotto":
    case "lotto_bingo":
      return <ConfirmationNumberRoundedIcon fontSize="small" />;
    default:
      return <ExtensionRoundedIcon fontSize="small" />;
  }
}

export default function ActivityResultListCard({
  activity,
  typeLabel,
  busy,
  onView,
  onOpen,
  onDelete,
}: ActivityResultListCardProps) {
  const canEdit = activity.access.canUpdate;
  const conductedOn = activity.conductedOn ? formatCalendarDate(activity.conductedOn) : "Не указана";

  return (
    <Box
      component="article"
      sx={{
        minHeight: 104,
        display: "flex",
        alignItems: "center",
        gap: { xs: 1.25, sm: 1.75 },
        px: { xs: 1.75, sm: 2.5 },
        py: 1.5,
        bgcolor: "background.paper",
        transition: "background-color .17s ease",
        "&:hover": { bgcolor: "rgba(248, 250, 255, 0.96)" },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 42,
          height: 42,
          display: { xs: "none", sm: "grid" },
          placeItems: "center",
          flexShrink: 0,
          borderRadius: 1.625,
          color: "secondary.main",
          bgcolor: "rgba(7, 151, 189, 0.1)",
        }}
      >
        {getActivityIcon(activity.type)}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ minWidth: 0, fontWeight: 800, lineHeight: 1.15 }} noWrap>
            {activity.title}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          flexWrap="wrap"
          useFlexGap
          gap={0.875}
          alignItems="center"
          sx={{ mt: 0.75, minWidth: 0 }}
        >
          <AppChip
            label={typeLabel}
            size="small"
            color="secondary"
            sx={{ height: 24, fontSize: 11, fontWeight: 800 }}
          />
          <RowMeta
            icon={<CalendarMonthRoundedIcon fontSize="inherit" />}
            label={conductedOn}
            tooltip={
              activity.conductedOn
                ? "Дата проведения"
                : "Дата проведения не указана: Analytics использует дату сохранения"
            }
          />
          <RowMeta
            icon={<PeopleAltRoundedIcon fontSize="inherit" />}
            label={`${activity.recipientsCount}`}
            tooltip="Игроки"
          />
          <RowMeta
            icon={<PersonOutlineRoundedIcon fontSize="inherit" />}
            label={activity.hostNickname}
            tooltip="Ведущий"
          />
        </Stack>
      </Box>

      <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
        <Tooltip title="Просмотреть активность">
          <IconButton
            aria-label={`Просмотреть активность «${activity.title}»`}
            onClick={onView}
            disabled={busy}
            size="small"
          >
            <VisibilityRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {canEdit ? (
          <Tooltip title="Редактировать активность">
            <IconButton
              aria-label={`Редактировать активность «${activity.title}»`}
              onClick={onOpen}
              disabled={busy}
              size="small"
            >
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        {activity.access.canDelete ? (
          <Tooltip title="Удалить активность">
            <IconButton
              aria-label={`Удалить активность «${activity.title}»`}
              onClick={onDelete}
              disabled={busy}
              size="small"
              color="error"
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
    </Box>
  );
}

function RowMeta({ icon, label, tooltip }: { icon: ReactNode; label: string; tooltip: string }) {
  return (
    <Tooltip title={tooltip}>
      <Stack
        direction="row"
        spacing={0.4}
        alignItems="center"
        sx={{ minWidth: 0, color: "text.secondary", fontSize: 14 }}
      >
        <Box sx={{ display: "grid", placeItems: "center", fontSize: 15 }}>{icon}</Box>
        <Typography variant="body2" noWrap>
          {label}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
