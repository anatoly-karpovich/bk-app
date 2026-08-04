import { useEffect, useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import { Alert, Box, Card, CardContent, CircularProgress, InputAdornment, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppTextInput from "../../components/ui/AppTextInput";
import { quizConfigsTexts } from "../../texts/quizConfigsTexts";
import type { Project } from "../projects/types";
import { quizConfigsApi } from "./api/quizConfigs.client";
import QuizConfigSelectionCard from "./components/QuizConfigSelectionCard";
import type { QuizConfig } from "../utilities/quizzes/types";

interface QuizConfigsPageProps {
  selectedProject: Project | null;
}

export default function QuizConfigsPage({ selectedProject }: QuizConfigsPageProps) {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<QuizConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projectId = selectedProject?.id;

  const loadConfigs = async () => {
    if (!projectId) {
      return;
    }

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

    if (!normalizedQuery) {
      return configs;
    }

    return configs.filter((config) =>
      `${config.name} ${config.description}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [configs, searchQuery]);

  if (!selectedProject) {
    return <Alert severity="warning">{quizConfigsTexts.alerts.projectRequired}</Alert>;
  }

  return (
    <Stack spacing={3}>
      <GamePageHeader
        breadcrumbPath="/configs/quizzes"
        title={quizConfigsTexts.page.title}
        description={quizConfigsTexts.page.description}
        chips={[
          { label: quizConfigsTexts.page.projectChip(selectedProject.name) },
          { label: quizConfigsTexts.page.configsChip(configs.length), color: "secondary" },
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
        ]}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
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
            gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "repeat(2, minmax(0, 1fr))" },
            gap: 2.25,
          }}
        >
          {visibleConfigs.map((config) => (
            <QuizConfigSelectionCard
              key={config.id}
              config={config}
              onSelect={() => navigate(`/configs/quizzes/${encodeURIComponent(config.id)}`)}
            />
          ))}
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ py: 4, textAlign: "center" }}>
            <QuizRoundedIcon color="disabled" sx={{ fontSize: 36, mb: 1 }} />
            <Typography variant="h6">
              {configs.length ? quizConfigsTexts.empty.searchTitle : quizConfigsTexts.empty.noConfigsTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {configs.length ? quizConfigsTexts.empty.searchDescription : quizConfigsTexts.empty.noConfigsDescription}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
