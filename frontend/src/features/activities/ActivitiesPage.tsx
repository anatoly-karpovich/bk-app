import { useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Card, CardContent, CircularProgress, InputAdornment, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppTextInput from "../../components/ui/AppTextInput";
import type { Project } from "../projects/types";
import ActivityResultListCard from "./components/ActivityResultListCard";
import { useActivityResults } from "./hooks/useActivityResults";

interface ActivitiesPageProps {
  selectedProject: Project | null;
}

export default function ActivitiesPage({ selectedProject }: ActivitiesPageProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { activities, error, isLoading, reload } = useActivityResults(selectedProject?.id);
  const visibleActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru");
    if (!normalizedQuery) return activities;
    return activities.filter((activity) =>
      `${activity.title} ${activity.type} ${activity.hostNickname}`.toLocaleLowerCase("ru").includes(normalizedQuery),
    );
  }, [activities, query]);
  const typeLabels = useMemo(
    () => new Map(selectedProject?.activityTypes.map((setting) => [setting.type, setting.defaultTitle]) ?? []),
    [selectedProject],
  );
  const showSearch = activities.length >= 4;

  if (!selectedProject) {
    return <Alert severity="warning">Выберите проект, чтобы просматривать его активности.</Alert>;
  }

  return (
    <Stack spacing={2.75}>
      <GamePageHeader
        breadcrumbPath="/activities"
        title="Активности"
        description="Результаты ручных мероприятий проекта: исторических, форумных и внешних игр."
        chips={[
          { label: `Проект: ${selectedProject.name}` },
          { label: `Всего: ${activities.length}`, color: "secondary" },
        ]}
        actions={[
          {
            key: "refresh",
            label: "Обновить",
            icon: <RefreshRoundedIcon />,
            onClick: reload,
            loading: isLoading,
            variant: "text",
            color: "inherit",
          },
          {
            key: "create",
            label: "Создать",
            icon: <AddRoundedIcon />,
            onClick: () => navigate("/activities/new"),
            variant: "contained",
          },
        ]}
        cardSx={{
          position: "relative",
          overflow: "hidden",
          minHeight: { md: 224 },
          "&::after": {
            content: '""',
            position: "absolute",
            width: 420,
            height: 420,
            right: -120,
            bottom: -180,
            borderRadius: "50%",
            bgcolor: "rgba(104, 124, 255, 0.08)",
          },
          "& > *": { position: "relative", zIndex: 1 },
        }}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            spacing={2.25}
            alignItems={{ lg: "center" }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h5">Список активностей</Typography>
              <Typography variant="body2" color="text.secondary">
                Черновики и завершённые результаты показаны вместе — от последних изменённых к ранним.
              </Typography>
            </Stack>
            {showSearch ? (
              <AppTextInput
                size="small"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Найти активность"
                inputProps={{ "aria-label": "Найти активность" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" color="disabled" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: "100%", lg: 280 } }}
              />
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {isLoading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : visibleActivities.length ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2.25,
          }}
        >
          {visibleActivities.map((activity) => (
            <ActivityResultListCard
              key={activity.id}
              activity={activity}
              typeLabel={typeLabels.get(activity.type) ?? activity.type}
              onOpen={() => navigate(`/activities/${encodeURIComponent(activity.id)}`)}
            />
          ))}
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="h6">{activities.length ? "Ничего не найдено" : "Активностей пока нет"}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {activities.length
                ? "Измените поисковый запрос."
                : "Добавьте первый сохранённый результат мероприятия."}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
