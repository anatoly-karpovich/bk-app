import { useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import AppMultiSelectFilter from "../../components/ui/AppMultiSelectFilter";
import type { Project } from "../projects/types";
import ActivityResultListCard from "./components/ActivityResultListCard";
import { useActivityResults } from "./hooks/useActivityResults";
import type { ActivityResultListItem } from "./types";

interface ActivitiesPageProps {
  selectedProject: Project | null;
}

export default function ActivitiesPage({ selectedProject }: ActivitiesPageProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ActivityResultListItem | null>(null);
  const navigate = useNavigate();
  const { activities, error, isLoading, deletingActivityId, reload, remove } = useActivityResults(selectedProject?.id);
  const activityTypeOptions = useMemo(
    () => selectedProject?.activityTypes.map((setting) => ({ value: setting.type, label: setting.defaultTitle })) ?? [],
    [selectedProject],
  );
  const activeTypes = selectedTypes ?? activityTypeOptions.map((option) => option.value);
  const visibleActivities = useMemo(() => {
    return activities.filter((activity) => activeTypes.includes(activity.type));
  }, [activeTypes, activities]);
  const typeLabels = useMemo(
    () => new Map(selectedProject?.activityTypes.map((setting) => [setting.type, setting.defaultTitle]) ?? []),
    [selectedProject],
  );
  useEffect(() => {
    setSelectedTypes(activityTypeOptions.map((option) => option.value));
  }, [activityTypeOptions]);

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
                Сохранённые результаты показаны от последних изменённых к ранним.
              </Typography>
            </Stack>
            <AppMultiSelectFilter
              label="Проведения"
              allLabel="Все типы"
              options={activityTypeOptions}
              selectedValues={activeTypes}
              onSelectedValuesChange={setSelectedTypes}
            />
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
            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
            gap: 2.25,
          }}
        >
          {visibleActivities.map((activity) => (
            <Card key={activity.id} sx={{ overflow: "hidden" }}>
              <ActivityResultListCard
                activity={activity}
                typeLabel={typeLabels.get(activity.type) ?? activity.type}
                busy={deletingActivityId === activity.id}
                onView={() => navigate(`/activities/${encodeURIComponent(activity.id)}?mode=view`)}
                onOpen={() => navigate(`/activities/${encodeURIComponent(activity.id)}`)}
                onDelete={() => setPendingDelete(activity)}
              />
            </Card>
          ))}
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="h6">{activities.length ? "Для выбранных типов активностей пока нет" : "Активностей пока нет"}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {activities.length
                ? "Измените выбранные типы проведений."
                : "Добавьте первый сохранённый результат мероприятия."}
            </Typography>
          </CardContent>
        </Card>
      )}

      {pendingDelete ? (
        <AppConfirmDialog
          open
          title="Удалить активность?"
          description={`Результат «${pendingDelete.title}» и его Analytics-факт будут удалены без возможности восстановления.`}
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          confirmColor="error"
          loading={deletingActivityId === pendingDelete.id}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            void remove(pendingDelete).then((removed) => {
              if (removed) setPendingDelete(null);
            });
          }}
        />
      ) : null}
    </Stack>
  );
}
