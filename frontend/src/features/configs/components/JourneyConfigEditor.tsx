import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { FormControl, FormControlLabel, FormLabel, Grid, IconButton, MenuItem, Radio, RadioGroup, Stack } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { JourneyJackpotCountMode, JourneyRules, JourneyRulesCell, RewardPool } from "../../journey/types";
import type { ProjectResource } from "../../projects/types";
import RewardPoolEditor, { createRewardPool } from "./RewardPoolEditor";
import RuleSection from "./RuleSection";

interface JourneyConfigEditorProps {
  rules: JourneyRules;
  resources: ProjectResource[];
  disabled: boolean;
  onChange: (rules: JourneyRules) => void;
}

const achievementLabels = {
  unlucky: "Невезучий",
  careful: "Осторожный",
  collector: "Коллекционер",
  lucky: "Счастливчик",
} as const;

export default function JourneyConfigEditor({ rules, resources, disabled, onChange }: JourneyConfigEditorProps) {
  const jackpot = rules.jackpot;
  const cells = Array.isArray(rules.cells) ? rules.cells : [];
  const achievements = rules.achievements ?? {};

  function patchRules(patch: Partial<JourneyRules>) {
    onChange({ ...rules, ...patch });
  }

  function updateCell(index: number, patch: Partial<JourneyRulesCell>) {
    patchRules({ cells: cells.map((cell, currentIndex) => (currentIndex === index ? { ...cell, ...patch } : cell)) });
  }

  function addCell() {
    patchRules({
      cells: [...cells, { id: `cell_${Date.now()}`, kind: "bonus", count: 1, rewardPool: { mode: "all", rewards: [] } }],
    });
  }

  return (
    <Stack spacing={2.5}>
      <RuleSection title="Основные параметры" description="Размер поля и допустимый диапазон броска кубика.">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <AppTextInput fullWidth type="number" label="Размер карты" value={rules.mapSize ?? 0} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => patchRules({ mapSize: Number(event.target.value) })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <AppTextInput fullWidth type="number" label="Минимальный бросок" value={rules.minDice ?? 0} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => patchRules({ minDice: Number(event.target.value) })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <AppTextInput fullWidth type="number" label="Максимальный бросок" value={rules.maxDice ?? 0} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => patchRules({ maxDice: Number(event.target.value) })} />
          </Grid>
        </Grid>
      </RuleSection>

      <RuleSection title="Стартовые награды">
        <Stack spacing={2.5}>
          <RewardPoolEditor pool={rules.initialRewardPool} resources={resources} disabled={disabled} onChange={(initialRewardPool) => patchRules({ initialRewardPool })} emptyLabel="Стартовая награда не задана." />
        </Stack>
      </RuleSection>

      <RuleSection title="Джекпот">
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12}>
            <FormControl disabled={disabled}>
              <FormLabel>Способ расчёта количества</FormLabel>
              <RadioGroup
                row
                value={jackpot.countMode}
                onChange={(event) => patchRules({ jackpot: { ...jackpot, countMode: event.target.value as JourneyJackpotCountMode } })}
              >
                <FormControlLabel value="fixed" control={<Radio />} label="Фиксированное количество" />
                <FormControlLabel value="by_players" control={<Radio />} label="По числу игроков" />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            {jackpot.countMode === "by_players" ? (
              <AppTextInput
                fullWidth
                type="number"
                label="Игроков на одно сокровище"
                value={jackpot.playersPerJackpot}
                disabled={disabled}
                inputProps={{ min: 1, step: 1 }}
                helperText="Количество округляется вверх, максимум — 7 сокровищ."
                onChange={(event) => patchRules({ jackpot: { ...jackpot, playersPerJackpot: Number(event.target.value) } })}
              />
            ) : (
              <AppTextInput
                fullWidth
                type="number"
                label="Количество сокровищ"
                value={jackpot.count}
                disabled={disabled}
                inputProps={{ min: 0, max: 7, step: 1 }}
                onChange={(event) => patchRules({ jackpot: { ...jackpot, count: Number(event.target.value) } })}
              />
            )}
          </Grid>
          <Grid item xs={12} sm={8}>
            <RewardPoolEditor pool={jackpot.rewardPool} resources={resources} disabled={disabled} onChange={(rewardPool) => patchRules({ jackpot: { ...jackpot, rewardPool } })} />
          </Grid>
        </Grid>
      </RuleSection>

      <RuleSection title="Клетки поля" description="Каждая строка задаёт отдельный тип бонусной клетки или ловушки.">
        <Stack spacing={2}>
          {cells.map((cell, index) => (
            <Stack key={index} spacing={1.5} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                <AppTextInput size="small" label="Идентификатор" value={cell.id ?? ""} disabled={disabled} onChange={(event) => updateCell(index, { id: event.target.value })} sx={{ flex: 1, minWidth: { md: 260 } }} />
                <AppTextInput select size="small" label="Тип" value={cell.kind ?? "bonus"} disabled={disabled} onChange={(event) => updateCell(index, { kind: event.target.value as JourneyRulesCell["kind"] })} sx={{ minWidth: { md: 150 } }}>
                  <MenuItem value="bonus">Бонус</MenuItem>
                  <MenuItem value="trap">Ловушка</MenuItem>
                </AppTextInput>
                <AppTextInput select size="small" label="Тип выдачи наград" value={cell.rewardPool.mode} disabled={disabled} onChange={(event) => updateCell(index, { rewardPool: createRewardPool(event.target.value as RewardPool["mode"], resources) })} sx={{ minWidth: { md: 260 } }}>
                  <MenuItem value="all">Выдать все награды</MenuItem>
                  <MenuItem value="weighted_one">Выбрать одну по весам</MenuItem>
                  <MenuItem value="independent">Проверить каждую по шансу</MenuItem>
                </AppTextInput>
                <AppTextInput size="small" type="number" label="Количество" value={cell.count ?? 0} disabled={disabled} inputProps={{ min: 0, step: 1 }} onChange={(event) => updateCell(index, { count: Number(event.target.value) })} sx={{ minWidth: { md: 150 } }} />
                <IconButton aria-label="Удалить тип клетки" color="error" onClick={() => patchRules({ cells: cells.filter((_cell, currentIndex) => currentIndex !== index) })} disabled={disabled}>
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Stack>
              <RewardPoolEditor pool={cell.rewardPool} resources={resources} disabled={disabled} onChange={(rewardPool) => updateCell(index, { rewardPool })} showModeSelector={false} />
            </Stack>
          ))}
          <AppPillButton variant="outlined" size="small" startIcon={<AddRoundedIcon />} onClick={addCell} disabled={disabled} sx={{ alignSelf: "flex-start" }}>
            Добавить тип клетки
          </AppPillButton>
        </Stack>
      </RuleSection>

      <RuleSection title="Достижения" description="Условия достижений определяются движком игры; здесь настраиваются только награды.">
        <Grid container spacing={2}>
          {(Object.keys(achievementLabels) as Array<keyof typeof achievementLabels>).map((achievement) => (
            <Grid key={achievement} item xs={12} md={6}>
              <Stack spacing={1} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <strong>{achievementLabels[achievement]}</strong>
                <RewardPoolEditor pool={achievements[achievement].rewardPool} resources={resources} disabled={disabled} onChange={(rewardPool) => patchRules({ achievements: { ...achievements, [achievement]: { rewardPool } } as JourneyRules["achievements"] })} />
              </Stack>
            </Grid>
          ))}
        </Grid>
      </RuleSection>
    </Stack>
  );
}
