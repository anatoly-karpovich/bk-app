import EditRoundedIcon from "@mui/icons-material/EditRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import { Card, CardContent, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import type { QuizConfig } from "../types";

interface QuizCreateStartStateProps {
  configs: readonly QuizConfig[];
  selectedConfigId: string;
  disabled: boolean;
  onConfigChange: (configId: string) => void;
  onStart: () => void;
}

const steps = [
  { icon: <SettingsOutlinedIcon fontSize="small" />, title: "Выберите конфиг", text: "Количество вопросов и награды загрузятся автоматически." },
  { icon: <EditRoundedIcon fontSize="small" />, title: "Заполните вопросы", text: "Добавьте текст, правильный ответ и заметки ведущему." },
  { icon: <SwapVertRoundedIcon fontSize="small" />, title: "Настройте порядок", text: "Перетаскивайте вопросы в левой панели." },
  { icon: <SaveRoundedIcon fontSize="small" />, title: "Сохраните", text: "Готовая викторина появится в библиотеке." },
];

export default function QuizCreateStartState({ configs, selectedConfigId, disabled, onConfigChange, onStart }: QuizCreateStartStateProps) {
  return (
    <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="stretch">
      <Card sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0, alignSelf: "flex-start" }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={1.75}>
            <Stack spacing={0.5}>
              <Typography variant="h5">Викторина</Typography>
              <Typography variant="body2" color="text.secondary">Выберите конфиг, чтобы подготовить структуру вопросов.</Typography>
            </Stack>
            <FormControl fullWidth size="small">
              <InputLabel id="quiz-config-label">Конфиг</InputLabel>
              <Select labelId="quiz-config-label" label="Конфиг" value={selectedConfigId} onChange={(event) => onConfigChange(event.target.value)} disabled={disabled || !configs.length}>
                {configs.map((config) => <MenuItem key={config.id} value={config.id}>{config.name || "Без названия"}</MenuItem>)}
              </Select>
            </FormControl>
            <AppPillButton variant="contained" fullWidth onClick={onStart} disabled={disabled || !selectedConfigId}>Начать</AppPillButton>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ flex: 1, minWidth: 0, minHeight: { lg: 330 }, display: "grid", placeItems: "center" }}>
        <CardContent sx={{ width: "100%", maxWidth: 880, p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2.25}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mx: "auto", maxWidth: 820, px: 1.75, py: 1.4, borderRadius: 2, bgcolor: "rgba(8, 145, 178, 0.11)", color: "secondary.dark" }}>
              <InfoOutlinedIcon fontSize="small" sx={{ mt: "1px" }} />
              <Typography variant="body2">Нажмите «Начать», чтобы создать локальный черновик по выбранному конфигу.</Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              {steps.map((step) => (
                <Stack key={step.title} spacing={0.8} alignItems="center" textAlign="center" sx={{ flex: 1, p: 2, minHeight: 142, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.default" }}>
                  <Stack alignItems="center" justifyContent="center" sx={{ width: 42, height: 42, borderRadius: 1.5, bgcolor: "rgba(79, 70, 229, 0.1)", color: "primary.main" }}>{step.icon}</Stack>
                  <Typography variant="subtitle2">{step.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{step.text}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
