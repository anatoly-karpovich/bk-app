import { useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import { Alert, Box, Card, CardContent, CircularProgress, InputAdornment, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import AppTextInput from "../../components/ui/AppTextInput";
import { useAuth } from "../auth/useAuth";
import { quizConfigsTexts } from "../../texts/quizConfigsTexts";
import type { Project } from "../projects/types";
import { quizConfigsApi } from "./api/quizConfigs.client";
import QuizConfigSelectionCard from "./components/QuizConfigSelectionCard";
import { getQuizAuthorLabel } from "../utilities/quizzes/quizAuthor.helpers";
import type { QuizConfig } from "../utilities/quizzes/types";

interface QuizConfigsPageProps {
  selectedProject: Project | null;
}

export default function QuizConfigsPage({ selectedProject }: QuizConfigsPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [configs, setConfigs] = useState<QuizConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuizConfig | null>(null);
  const projectId = selectedProject?.id;
  const showSearch = configs.length >= 4;

  const loadConfigs = async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      setConfigs(await quizConfigsApi.list(projectId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : quizConfigsTexts.alerts.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConfigs();
  }, [projectId]);

  const visibleConfigs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    if (!showSearch || !normalizedQuery) return configs;

    return configs.filter((config) =>
      `${config.name} ${config.description}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [configs, searchQuery, showSearch]);

  const stats = useMemo(
    () => ({
      system: configs.filter((config) => config.isSystem).length,
      draft: configs.filter((config) => config.status === "draft").length,
    }),
    [configs],
  );

  const deleteConfig = async () => {
    if (!projectId || !pendingDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await quizConfigsApi.delete(projectId, pendingDelete.id);
      setConfigs((current) => current.filter((config) => config.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : quizConfigsTexts.alerts.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selectedProject) {
    return <Alert severity="warning">{quizConfigsTexts.alerts.projectRequired}</Alert>;
  }

  return (
    <Stack spacing={2.75}>
      <GamePageHeader
        breadcrumbPath="/configs/quizzes"
        title={quizConfigsTexts.page.title}
        description={quizConfigsTexts.page.description}
        chips={[
          { label: quizConfigsTexts.page.projectChip(selectedProject.name) },
          { label: quizConfigsTexts.page.configsChip(configs.length), color: "secondary" },
          { label: quizConfigsTexts.page.systemConfigsChip(stats.system) },
          { label: quizConfigsTexts.page.draftConfigsChip(stats.draft), color: "warning" },
        ]}
        actions={[
          {
            key: "refresh",
            label: quizConfigsTexts.page.refresh,
            icon: <RefreshRoundedIcon />,
            onClick: () => void loadConfigs(),
            loading: isLoading,
            variant: "text",
            color: "inherit",
          },
          {
            key: "create",
            label: quizConfigsTexts.page.create,
            icon: <AddRoundedIcon />,
            onClick: () => navigate("/configs/quizzes/create"),
            variant: "contained",
          },
        ]}
        cardSx={{
          position: "relative",
          overflow: "hidden",
          minHeight: { md: 200 },
          "&::after": {
            content: '\"\"',
            position: "absolute",
            width: 420,
            height: 420,
            right: -120,
            bottom: -180,
            borderRadius: "50%",
            bgcolor: "rgba(104, 124, 255, 0.08)",
          },
          "& > *": { position: "relative", zIndex: 1 },
          "& .MuiTypography-h3": {
            fontSize: { xs: "2.5rem", md: "3.75rem" },
          },
        }}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
            spacing={2}
          >
            <Stack spacing={0.5}>
              <Typography variant="h5">{quizConfigsTexts.section.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {quizConfigsTexts.section.description}
              </Typography>
            </Stack>
            {showSearch ? (
              <AppTextInput
                size="small"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={quizConfigsTexts.section.searchPlaceholder}
                inputProps={{ "aria-label": quizConfigsTexts.section.searchPlaceholder }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" color="disabled" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0 }}
              />
            ) : (
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {quizConfigsTexts.section.searchHint}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {isLoading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : visibleConfigs.length ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
            gap: 2.25,
          }}
        >
          {visibleConfigs.map((config) => {
            const canEdit = user?.role === "admin" || (!config.isSystem && config.createdByUserId === user?.id);
            const canDelete = !config.isSystem && canEdit;
            const authorLabel = getQuizAuthorLabel(config.createdByNickname);

            return (
              <QuizConfigSelectionCard
                key={config.id}
                config={config}
                resources={selectedProject.resources}
                authorLabel={authorLabel}
                canEdit={canEdit}
                canDelete={canDelete}
                onSelect={() => navigate(`/configs/quizzes/${encodeURIComponent(config.id)}`)}
                onDelete={() => setPendingDelete(config)}
              />
            );
          })}
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ py: 6, textAlign: "center" }}>
            <QuizRoundedIcon color="disabled" sx={{ fontSize: 42, mb: 1.25 }} />
            <Typography variant="h6">
              {configs.length ? quizConfigsTexts.empty.searchTitle : quizConfigsTexts.empty.noConfigsTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {configs.length ? quizConfigsTexts.empty.searchDescription : quizConfigsTexts.empty.noConfigsDescription}
            </Typography>
          </CardContent>
        </Card>
      )}

      {pendingDelete ? (
        <AppConfirmDialog
          open
          title={quizConfigsTexts.deleteDialog.title}
          description={quizConfigsTexts.deleteDialog.description(pendingDelete.name || quizConfigsTexts.card.untitled)}
          confirmLabel={quizConfigsTexts.deleteDialog.confirm}
          cancelLabel={quizConfigsTexts.deleteDialog.cancel}
          confirmColor="error"
          loading={isDeleting}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => void deleteConfig()}
        />
      ) : null}
    </Stack>
  );
}
