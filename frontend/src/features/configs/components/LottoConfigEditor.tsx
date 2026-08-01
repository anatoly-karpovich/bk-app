import { Grid, MenuItem, Stack } from "@mui/material";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { LottoRules } from "../../lotto/types";
import type { ProjectResource } from "../../projects/types";
import RewardPoolEditor from "./RewardPoolEditor";
import RuleSection from "./RuleSection";

interface LottoConfigEditorProps {
  rules: LottoRules;
  resources: ProjectResource[];
  disabled: boolean;
  onChange: (rules: LottoRules) => void;
}

export default function LottoConfigEditor({ rules, resources, disabled, onChange }: LottoConfigEditorProps) {
  function patchRules(patch: Partial<LottoRules>) {
    onChange({ ...rules, ...patch });
  }

  return (
    <Stack spacing={2.5}>
      <RuleSection title="Карточка и диапазон">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}><AppTextInput fullWidth type="number" label="Минимальное число" value={rules.min ?? 0} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => patchRules({ min: Number(event.target.value) })} /></Grid>
          <Grid item xs={12} sm={4}><AppTextInput fullWidth type="number" label="Максимальное число" value={rules.max ?? 0} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => patchRules({ max: Number(event.target.value) })} /></Grid>
          <Grid item xs={12} sm={4}><AppTextInput fullWidth type="number" label="Чисел в карточке" value={rules.cardNumbersAmount ?? 0} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => patchRules({ cardNumbersAmount: Number(event.target.value) })} /></Grid>
        </Grid>
      </RuleSection>
      <RuleSection title="Призы">
        <Stack spacing={2.5}>
          <div><strong>Первое место</strong><RewardPoolEditor resources={resources} pool={rules.firstPlacePrize} onChange={(firstPlacePrize) => patchRules({ firstPlacePrize })} disabled={disabled} /></div>
          <div><strong>Второе место</strong><RewardPoolEditor resources={resources} pool={rules.secondPlacePrize} onChange={(secondPlacePrize) => patchRules({ secondPlacePrize })} disabled={disabled} /></div>
          <div><strong>Остальным активным игрокам</strong><RewardPoolEditor resources={resources} pool={rules.otherActivePlayersPrize} onChange={(otherActivePlayersPrize) => patchRules({ otherActivePlayersPrize })} disabled={disabled} /></div>
        </Stack>
      </RuleSection>
      <RuleSection title="Распределение награды">
        <AppTextInput select fullWidth label="Если победителей несколько" value={rules.rewardDistributionMode ?? "full_per_winner"} disabled={disabled} onChange={(event) => patchRules({ rewardDistributionMode: event.target.value as LottoRules["rewardDistributionMode"] })}>
          <MenuItem value="full_per_winner">Полная награда каждому победителю</MenuItem>
          <MenuItem value="split_pool">Разделить банк между победителями</MenuItem>
        </AppTextInput>
      </RuleSection>
    </Stack>
  );
}
