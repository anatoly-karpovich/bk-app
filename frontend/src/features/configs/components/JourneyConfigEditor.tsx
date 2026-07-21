import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { FormControlLabel, Grid, IconButton, MenuItem, Stack, Switch } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { JourneyRules, JourneyRulesCell } from "../../journey/types";
import type { ProjectCurrency } from "../../projects/types";
import CurrencyValuesEditor from "./CurrencyValuesEditor";
import RuleSection from "./RuleSection";

interface JourneyConfigEditorProps {
  rules: JourneyRules;
  currencies: ProjectCurrency[];
  disabled: boolean;
  onChange: (rules: JourneyRules) => void;
}

const achievementLabels = {
  unlucky: "Невезучий",
  careful: "Осторожный",
  collector: "Коллекционер",
  lucky: "Счастливчик",
} as const;

export default function JourneyConfigEditor({ rules, currencies, disabled, onChange }: JourneyConfigEditorProps) {
  const jackpot = rules.jackpot ?? { count: 0, rewards: [] };
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
      cells: [...cells, { id: `cell_${Date.now()}`, kind: "bonus", count: 1, rewards: [] }],
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

      <RuleSection title="Старт и лимит выигрыша">
        <Stack spacing={2.5}>
          <CurrencyValuesEditor currencies={currencies} values={rules.initialRewards} onChange={(initialRewards) => patchRules({ initialRewards })} disabled={disabled} emptyLabel="Стартовая награда не задана." />
          <FormControlLabel
            control={<Switch checked={rules.maxPrizes === null} onChange={(_event, checked) => patchRules({ maxPrizes: checked ? null : [] })} disabled={disabled} />}
            label="Без лимита выигрыша"
          />
          {rules.maxPrizes !== null ? <CurrencyValuesEditor currencies={currencies} values={rules.maxPrizes} onChange={(maxPrizes) => patchRules({ maxPrizes })} disabled={disabled} emptyLabel="Лимит выигрыша не задан." /> : null}
        </Stack>
      </RuleSection>

      <RuleSection title="Джекпот">
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} sm={4}>
            <AppTextInput fullWidth type="number" label="Количество клеток" value={jackpot.count ?? 0} disabled={disabled} inputProps={{ min: 0, step: 1 }} onChange={(event) => patchRules({ jackpot: { ...jackpot, count: Number(event.target.value) } })} />
          </Grid>
          <Grid item xs={12} sm={8}>
            <CurrencyValuesEditor currencies={currencies} values={jackpot.rewards} onChange={(rewards) => patchRules({ jackpot: { ...jackpot, rewards } })} disabled={disabled} />
          </Grid>
        </Grid>
      </RuleSection>

      <RuleSection title="Клетки поля" description="Каждая строка задаёт отдельный тип бонусной клетки или ловушки.">
        <Stack spacing={2}>
          {cells.map((cell, index) => (
            <Stack key={`${cell.id}-${index}`} spacing={1.5} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                <AppTextInput size="small" label="Идентификатор" value={cell.id ?? ""} disabled={disabled} onChange={(event) => updateCell(index, { id: event.target.value })} sx={{ flex: 1 }} />
                <AppTextInput select size="small" label="Тип" value={cell.kind ?? "bonus"} disabled={disabled} onChange={(event) => updateCell(index, { kind: event.target.value as JourneyRulesCell["kind"] })} sx={{ minWidth: { md: 150 } }}>
                  <MenuItem value="bonus">Бонус</MenuItem>
                  <MenuItem value="trap">Ловушка</MenuItem>
                </AppTextInput>
                <AppTextInput size="small" type="number" label="Количество" value={cell.count ?? 0} disabled={disabled} inputProps={{ min: 0, step: 1 }} onChange={(event) => updateCell(index, { count: Number(event.target.value) })} sx={{ minWidth: { md: 150 } }} />
                <IconButton aria-label="Удалить тип клетки" color="error" onClick={() => patchRules({ cells: cells.filter((_cell, currentIndex) => currentIndex !== index) })} disabled={disabled}>
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Stack>
              <CurrencyValuesEditor currencies={currencies} values={cell.rewards} onChange={(rewards) => updateCell(index, { rewards })} disabled={disabled} />
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
                <CurrencyValuesEditor currencies={currencies} values={achievements[achievement]?.rewards ?? []} onChange={(rewards) => patchRules({ achievements: { ...achievements, [achievement]: { rewards } } as JourneyRules["achievements"] })} disabled={disabled} />
              </Stack>
            </Grid>
          ))}
        </Grid>
      </RuleSection>
    </Stack>
  );
}
