import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import AppChip from "../../../components/ui/AppChip";
import type { ActivityResultListItem } from "../types";

interface ActivityResultListCardProps {
  activity: ActivityResultListItem;
  typeLabel: string;
  onOpen: () => void;
}

function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function getDateLabel(activity: ActivityResultListItem): string {
  if (activity.conductedOn) return `Проведена ${formatCalendarDate(activity.conductedOn)}`;
  return "Дата проведения не указана — Analytics использует дату сохранения";
}

export default function ActivityResultListCard({ activity, typeLabel, onOpen }: ActivityResultListCardProps) {
  return (
    <Card
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
      sx={{
        height: "100%",
        minHeight: 236,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "border-color .18s ease, box-shadow .18s ease, transform .18s ease",
        border: "1px solid transparent",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: "rgba(79, 70, 229, 0.38)",
          boxShadow: "0 18px 38px rgba(30, 40, 58, 0.12)",
        },
        cursor: "pointer",
      }}
    >
      <CardContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column" }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="flex-start">
          <Typography variant="h5" sx={{ minWidth: 0, lineHeight: 1.15 }} noWrap>
            {activity.title}
          </Typography>
          <AppChip label={typeLabel} size="small" color="secondary" sx={{ flexShrink: 0 }} />
        </Stack>

        <Stack spacing={1.1} sx={{ pt: 1.75, mt: 2, borderTop: 1, borderColor: "divider" }}>
          <CardMeta icon={<CalendarMonthRoundedIcon fontSize="inherit" />} label={getDateLabel(activity)} />
          <CardMeta icon={<PeopleAltRoundedIcon fontSize="inherit" />} label={`Получателей: ${activity.recipientsCount}`} />
          <CardMeta icon={<PersonOutlineRoundedIcon fontSize="inherit" />} label={`Ведущий: ${activity.hostNickname}`} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function CardMeta({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        sx={{
          width: 27,
          height: 27,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          borderRadius: 1.25,
          color: "text.secondary",
          bgcolor: "action.hover",
          fontSize: 14,
        }}
      >
        {icon}
      </Box>
      <Typography variant="caption" fontWeight={700} noWrap>
        {label}
      </Typography>
    </Stack>
  );
}
