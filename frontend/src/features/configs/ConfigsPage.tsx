import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import type { AppConfig } from "./types";

interface ConfigsPageProps {
  configs: AppConfig[];
  selectedConfigId: string;
  onSelectConfig: (configId: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function ConfigsPage({
  configs,
  selectedConfigId,
  onSelectConfig,
  isLoading,
  error,
}: ConfigsPageProps) {
  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={1.5}>
            <Typography variant="h4">Глобальные конфиги</Typography>
            <Typography variant="body1" color="text.secondary">
              Выбор активного проекта для запуска новых игр. Изменение выбора не меняет состояние сервера и влияет только
              на новые партии в текущем браузере.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Alert icon={<SettingsRoundedIcon fontSize="inherit" />} severity="info">
        Journey и Battleships уже используют backend-конфиги. Следующие игры будут брать правила из выбранного проекта,
        а текущие партии останутся на своем snapshot-конфиге.
      </Alert>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {!isLoading && !configs.length ? <Alert severity="warning">Конфиги не найдены.</Alert> : null}

      <Grid container spacing={3}>
        {configs.map((config) => {
          const isSelected = config.id === selectedConfigId;
          const { journeySummary, battleshipsSummary } = config;

          return (
            <Grid key={config.id} item xs={12} xl={6}>
              <Card sx={{ height: "100%" }}>
                <CardHeader
                  title={config.name}
                  subheader={config.description || "Без описания"}
                  action={
                    <Stack direction="row" spacing={1} sx={{ pr: 2, pt: 2 }} flexWrap="wrap" useFlexGap>
                      {isSelected ? <Chip color="success" label="Выбран" /> : null}
                      <Chip variant="outlined" label={journeySummary ? "Journey" : "Без Journey"} />
                      <Chip variant="outlined" label={battleshipsSummary ? "Battleships" : "Без Battleships"} />
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={2.5}>
                    {journeySummary ? (
                      <Stack spacing={1}>
                        <Typography variant="subtitle2">Journey</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={`Валюта: ${journeySummary.currency}`} />
                          <Chip label={`Карта: ${journeySummary.mapSize}`} />
                          <Chip label={`Ход: ${journeySummary.diceRange}`} />
                          <Chip label={`Сокровище: ${journeySummary.jackpot}`} color="warning" />
                          <Chip label={`Бонусы: ${journeySummary.bonusKinds}`} color="success" />
                          <Chip label={`Ловушки: ${journeySummary.trapKinds}`} color="error" />
                          <Chip
                            label={
                              journeySummary.prizeLimit === null
                                ? "Без лимита"
                                : `Лимит: ${journeySummary.prizeLimit}`
                            }
                          />
                        </Stack>
                      </Stack>
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Для Journey конфиг пока не задан.
                        </Typography>
                      </Box>
                    )}

                    {battleshipsSummary ? (
                      <Stack spacing={1}>
                        <Typography variant="subtitle2">Battleships</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={`Поле: ${battleshipsSummary.boardSize}x${battleshipsSummary.boardSize}`} />
                          <Chip label={`Попытки: ${battleshipsSummary.maxShots}`} />
                          <Chip
                            label={`Попадание: ${battleshipsSummary.hitPrize} ${battleshipsSummary.currency}`}
                            color="success"
                          />
                          {battleshipsSummary.fleet.map((ship) => (
                            <Chip key={ship} label={ship} variant="outlined" />
                          ))}
                        </Stack>
                      </Stack>
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Для Battleships конфиг пока не задан.
                        </Typography>
                      </Box>
                    )}

                    <Button
                      variant={isSelected ? "contained" : "outlined"}
                      color={isSelected ? "success" : "primary"}
                      startIcon={<CheckCircleRoundedIcon />}
                      disabled={isSelected}
                      onClick={() => onSelectConfig(config.id)}
                    >
                      {isSelected ? "Текущий проект" : "Выбрать проект"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
