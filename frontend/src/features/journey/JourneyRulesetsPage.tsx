import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  deleteJourneyRuleset,
  loadDefaultJourneyRulesetId,
  loadJourneyRulesets,
  saveDefaultJourneyRulesetId,
  saveJourneyRuleset,
} from "./storage";

function generateRulesetId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `journey-ruleset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getRulesSummary(ruleset) {
  const positiveCells = ruleset.rules.cells.filter((cell) => cell.kind === "bonus");
  const negativeCells = ruleset.rules.cells.filter((cell) => cell.kind === "trap");

  return {
    currency: ruleset.rules.currency,
    mapSize: ruleset.rules.mapSize,
    diceRange: `${ruleset.rules.minDice}-${ruleset.rules.maxDice}`,
    jackpot: `${ruleset.rules.jackpot.count} × ${ruleset.rules.jackpot.prize}`,
    bonusKinds: positiveCells.length,
    trapKinds: negativeCells.length,
    hasPrizeLimit: Number.isFinite(ruleset.rules.maxPrize),
  };
}

export default function JourneyRulesetsPage({ onRulesetsChange }) {
  const [rulesets, setRulesets] = useState(() => loadJourneyRulesets());
  const [defaultRulesetId, setDefaultRulesetId] = useState(() => loadDefaultJourneyRulesetId());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRulesetName, setNewRulesetName] = useState("");
  const [newRulesetDescription, setNewRulesetDescription] = useState("");
  const [newRulesetBaseId, setNewRulesetBaseId] = useState(() => loadDefaultJourneyRulesetId());

  const sortedRulesets = useMemo(
    () =>
      [...rulesets].sort((left, right) => {
        if (left.id === defaultRulesetId) {
          return -1;
        }
        if (right.id === defaultRulesetId) {
          return 1;
        }
        if (left.isBuiltIn !== right.isBuiltIn) {
          return left.isBuiltIn ? -1 : 1;
        }
        return left.name.localeCompare(right.name, "ru");
      }),
    [defaultRulesetId, rulesets],
  );

  const canCreateRuleset = newRulesetName.trim().length > 0;

  function refreshRulesetsState(nextDefaultRulesetId = defaultRulesetId) {
    setRulesets(loadJourneyRulesets());
    setDefaultRulesetId(nextDefaultRulesetId);
    onRulesetsChange?.();
  }

  function handleSetDefaultRuleset(rulesetId) {
    const nextDefaultId = saveDefaultJourneyRulesetId(rulesetId);
    refreshRulesetsState(nextDefaultId);
  }

  function handleCreateRuleset() {
    const baseRuleset = rulesets.find((ruleset) => ruleset.id === newRulesetBaseId) ?? rulesets[0];

    saveJourneyRuleset({
      id: generateRulesetId(),
      name: newRulesetName.trim(),
      description: newRulesetDescription.trim(),
      rules: baseRuleset.rules,
    });

    refreshRulesetsState();
    setCreateDialogOpen(false);
    setNewRulesetName("");
    setNewRulesetDescription("");
    setNewRulesetBaseId(loadDefaultJourneyRulesetId());
  }

  function handleDuplicateRuleset(ruleset) {
    saveJourneyRuleset({
      id: generateRulesetId(),
      name: `${ruleset.name} (копия)`,
      description: ruleset.description,
      rules: ruleset.rules,
    });

    refreshRulesetsState();
  }

  function handleDeleteRuleset(rulesetId) {
    deleteJourneyRuleset(rulesetId);
    refreshRulesetsState(loadDefaultJourneyRulesetId());
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h4">Наборы правил</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                Выбор дефолтного ruleset и подготовка пользовательских наборов под разные проекты.
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateDialogOpen(true)}>
              Новый набор
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Alert icon={<SettingsRoundedIcon fontSize="inherit" />} severity="info">
        Изменение дефолтного ruleset влияет только на новые партии. Уже начатые игры продолжают жить на своём snapshot-конфиге.
      </Alert>

      <Grid container spacing={3}>
        {sortedRulesets.map((ruleset) => {
          const summary = getRulesSummary(ruleset);
          const isDefault = ruleset.id === defaultRulesetId;

          return (
            <Grid key={ruleset.id} item xs={12} xl={6}>
              <Card sx={{ height: "100%" }}>
                <CardHeader
                  title={ruleset.name}
                  subheader={ruleset.description || "Без описания"}
                  action={
                    <Stack direction="row" spacing={1} sx={{ pr: 2, pt: 2 }}>
                      {isDefault ? <Chip color="success" label="По умолчанию" /> : null}
                      <Chip variant="outlined" label={ruleset.isBuiltIn ? "Built-in" : "Custom"} />
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={`Валюта: ${summary.currency}`} />
                      <Chip label={`Карта: ${summary.mapSize}`} />
                      <Chip label={`Ход: ${summary.diceRange}`} />
                      <Chip label={`Сокровище: ${summary.jackpot}`} color="warning" />
                      <Chip label={`Бонусы: ${summary.bonusKinds}`} color="success" />
                      <Chip label={`Ловушки: ${summary.trapKinds}`} color="error" />
                      <Chip label={summary.hasPrizeLimit ? `Лимит: ${ruleset.rules.maxPrize}` : "Без лимита"} />
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <Button
                        variant={isDefault ? "contained" : "outlined"}
                        color={isDefault ? "success" : "primary"}
                        startIcon={<CheckCircleRoundedIcon />}
                        onClick={() => handleSetDefaultRuleset(ruleset.id)}
                        disabled={isDefault}
                      >
                        {isDefault ? "Выбран по умолчанию" : "Сделать дефолтным"}
                      </Button>

                      <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<ContentCopyRoundedIcon />}
                        onClick={() => handleDuplicateRuleset(ruleset)}
                      >
                        Дублировать
                      </Button>

                      {!ruleset.isBuiltIn ? (
                        <Button
                          variant="text"
                          color="error"
                          startIcon={<DeleteOutlineRoundedIcon />}
                          onClick={() => handleDeleteRuleset(ruleset.id)}
                        >
                          Удалить
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новый набор правил</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Название"
              value={newRulesetName}
              onChange={(event) => setNewRulesetName(event.target.value)}
              fullWidth
            />
            <TextField
              label="Описание"
              value={newRulesetDescription}
              onChange={(event) => setNewRulesetDescription(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="На основе"
              value={newRulesetBaseId}
              onChange={(event) => setNewRulesetBaseId(event.target.value)}
              fullWidth
            >
              {rulesets.map((ruleset) => (
                <MenuItem key={ruleset.id} value={ruleset.id}>
                  {ruleset.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setCreateDialogOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleCreateRuleset} disabled={!canCreateRuleset}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
