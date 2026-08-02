import { useEffect, useState } from "react";
import { Alert, Box, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { BattleshipsRules } from "../../battleships/types";
import type { AnyGameConfig, GameType, Project, UpdateGameConfigInput } from "../../projects/types";
import BattleshipsConfigEditor from "./BattleshipsConfigEditor";

const gameTypeLabels: Record<GameType, string> = {
  journey: "Карта Мародёров",
  lotto: "Лото",
  battleships: "Морской бой",
};

interface GameConfigEditorDialogProps {
  project: Project;
  gameConfig: AnyGameConfig | null;
  open: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: UpdateGameConfigInput) => Promise<void>;
}

export default function GameConfigEditorDialog({
  project,
  gameConfig,
  open,
  isLoading,
  isSaving,
  error,
  onClose,
  onSave,
}: GameConfigEditorDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<UpdateGameConfigInput["rules"] | null>(null);

  useEffect(() => {
    if (!gameConfig) {
      return;
    }

    setName(gameConfig.name);
    setDescription(gameConfig.description);
    setRules(structuredClone(gameConfig.rules));
  }, [gameConfig]);

  function renderRulesEditor() {
    if (!gameConfig || !rules) {
      return null;
    }

    if (gameConfig.gameType === "battleships") {
      return <BattleshipsConfigEditor rules={rules as BattleshipsRules} resources={project.resources} disabled={isSaving} onChange={setRules} />;
    }

    return null;
  }

  return (
    <Dialog open={open} onClose={isSaving ? undefined : onClose} fullWidth maxWidth="xl" scroll="paper">
      <DialogTitle>{gameConfig ? `Конфиг: ${gameConfig.name}` : "Загрузка конфига"}</DialogTitle>
      <DialogContent dividers sx={{ backgroundColor: "#f8fafc" }}>
        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>
        ) : gameConfig && rules ? (
          <Stack spacing={2.5}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Alert severity="info">Изменения применятся к новым играм. Уже созданные игры используют сохранённый снимок правил.</Alert>
            <Box sx={{ p: { xs: 2, md: 2.5 }, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle1">{gameTypeLabels[gameConfig.gameType]}</Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <AppTextInput label="Название" value={name} onChange={(event) => setName(event.target.value)} disabled={isSaving} required fullWidth />
                  <AppTextInput label="Описание" value={description} onChange={(event) => setDescription(event.target.value)} disabled={isSaving} fullWidth />
                </Stack>
                <Divider />
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Ресурсы проекта:</Typography>
                  {project.resources.map((resource) => <Chip key={resource.id} size="small" label={`${resource.label} (${resource.type === "currency" ? "валюта" : "предмет"})`} />)}
                </Stack>
              </Stack>
            </Box>
            {renderRulesEditor()}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <AppPillButton color="inherit" onClick={onClose} disabled={isSaving}>Отмена</AppPillButton>
        <AppPillButton variant="contained" onClick={() => rules && void onSave({ name, description, rules })} loading={isSaving} disabled={!gameConfig || !rules || isLoading || !name.trim()}>
          Сохранить
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
