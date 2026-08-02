import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { FormControlLabel, IconButton, MenuItem, Stack, Switch, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { ProjectResource } from "../../projects/types";
import type { ResourceAmount, RewardPool } from "../../rewards/types";

interface RewardPoolEditorProps {
  pool?: RewardPool;
  resources: ProjectResource[];
  disabled: boolean;
  onChange: (pool: RewardPool) => void;
  emptyLabel?: string;
  showModeSelector?: boolean;
  modeDisabled?: boolean;
  modeHelperText?: string;
  sourcePool?: RewardPool;
}

function createAmount(resources: ProjectResource[], excludedResourceIds: readonly string[] = []): ResourceAmount {
  return {
    resourceId: resources.find((resource) => !excludedResourceIds.includes(resource.id))?.id ?? resources[0]?.id ?? "",
    amount: 1,
  };
}

function getStep(resourceId: string, resources: ProjectResource[]): number {
  const resource = resources.find((candidate) => candidate.id === resourceId);
  return resource?.type === "currency" && resource.valueType === "decimal" ? 10 ** -resource.precision : 1;
}

function hasAvailableResource(resources: ProjectResource[], addedResourceIds: readonly string[]): boolean {
  return resources.some((resource) => !addedResourceIds.includes(resource.id));
}

function ResourceAmountFields({
  amount,
  resources,
  disabled,
  onChange,
  sourceAmount,
  trackChanges = false,
}: {
  amount: ResourceAmount;
  resources: ProjectResource[];
  disabled: boolean;
  onChange: (amount: ResourceAmount) => void;
  sourceAmount?: ResourceAmount;
  trackChanges?: boolean;
}) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ flex: 1 }}>
      <AppTextInput
        select
        size="small"
        label="Ресурс"
        value={amount.resourceId}
        changed={trackChanges && (!sourceAmount || sourceAmount.resourceId !== amount.resourceId)}
        disabled={disabled || !resources.length}
        onChange={(event) => onChange({ ...amount, resourceId: event.target.value })}
        sx={{ minWidth: { sm: 220 }, flex: 1 }}
      >
        {resources.map((resource) => (
          <MenuItem key={resource.id} value={resource.id}>
            {resource.label} ({resource.type === "currency" ? "валюта" : "предмет"})
          </MenuItem>
        ))}
      </AppTextInput>
      <AppTextInput
        size="small"
        type="number"
        label="Количество"
        value={amount.amount}
        changed={trackChanges && (!sourceAmount || sourceAmount.amount !== amount.amount)}
        disabled={disabled}
        inputProps={{ step: getStep(amount.resourceId, resources) }}
        onChange={(event) => onChange({ ...amount, amount: Number(event.target.value) })}
        sx={{ minWidth: { sm: 150 } }}
      />
    </Stack>
  );
}

function AllRewardsEditor({ rewards, resources, disabled, onChange, emptyLabel, sourceRewards, trackChanges }: {
  rewards: ResourceAmount[];
  resources: ProjectResource[];
  disabled: boolean;
  onChange: (rewards: ResourceAmount[]) => void;
  emptyLabel: string;
  sourceRewards?: ResourceAmount[];
  trackChanges: boolean;
}) {
  const addedResourceIds = rewards.map((reward) => reward.resourceId);
  const canAddResource = hasAvailableResource(resources, addedResourceIds);

  return (
    <Stack spacing={1.25}>
      {rewards.map((reward, index) => (
        <Stack key={`${reward.resourceId}-${index}`} direction="row" spacing={1} alignItems="center">
          <ResourceAmountFields amount={reward} sourceAmount={sourceRewards?.[index]} trackChanges={trackChanges} resources={resources} disabled={disabled} onChange={(next) => onChange(rewards.map((current, currentIndex) => currentIndex === index ? next : current))} />
          <IconButton aria-label="Удалить награду" onClick={() => onChange(rewards.filter((_reward, currentIndex) => currentIndex !== index))} disabled={disabled} color="error">
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </Stack>
      ))}
      {!rewards.length ? <Typography variant="body2" color="text.secondary">{emptyLabel}</Typography> : null}
      <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => onChange([...rewards, createAmount(resources, addedResourceIds)])} disabled={disabled || !canAddResource} sx={{ alignSelf: "flex-start" }}>
        Добавить ресурс
      </AppPillButton>
    </Stack>
  );
}

export function createRewardPool(mode: RewardPool["mode"], resources: ProjectResource[]): RewardPool {
  const reward = createAmount(resources);
  if (mode === "all") return { mode, rewards: resources.length ? [reward] : [] };
  if (mode === "weighted_one") return { mode, options: [{ reward: resources.length ? reward : null, weight: 1 }] };
  return { mode, options: resources.length ? [{ reward, chanceBps: 10_000 }] : [] };
}

const emptyRewardPool: RewardPool = { mode: "all", rewards: [] };

export default function RewardPoolEditor({
  pool: providedPool,
  resources,
  disabled,
  onChange,
  emptyLabel = "Награды не заданы.",
  showModeSelector = true,
  modeDisabled = false,
  modeHelperText,
  sourcePool,
}: RewardPoolEditorProps) {
  const pool = providedPool ?? emptyRewardPool;
  const trackChanges = sourcePool !== undefined;
  const modeChanged = Boolean(sourcePool && sourcePool.mode !== pool.mode);
  const sourceAllRewards = sourcePool?.mode === "all" ? sourcePool.rewards : undefined;
  const sourceWeightedOptions = sourcePool?.mode === "weighted_one" ? sourcePool.options : undefined;
  const sourceIndependentOptions = sourcePool?.mode === "independent" ? sourcePool.options : undefined;

  return (
    <Stack spacing={1.5}>
      {showModeSelector ? (
        <AppTextInput
          select
          size="small"
          label="Тип выдачи наград"
          helperText={modeHelperText}
          value={pool.mode}
          changed={trackChanges && modeChanged}
          disabled={disabled || modeDisabled}
          onChange={(event) => onChange(createRewardPool(event.target.value as RewardPool["mode"], resources))}
          sx={{ maxWidth: 340 }}
        >
          <MenuItem value="all">Выдать все награды</MenuItem>
          <MenuItem value="weighted_one">Выбрать одну по весам</MenuItem>
          <MenuItem value="independent">Проверить каждую по шансу</MenuItem>
        </AppTextInput>
      ) : null}

      {pool.mode === "all" ? <AllRewardsEditor rewards={pool.rewards} sourceRewards={sourceAllRewards} trackChanges={trackChanges} resources={resources} disabled={disabled} onChange={(rewards) => onChange({ mode: "all", rewards })} emptyLabel={emptyLabel} /> : null}

      {pool.mode === "weighted_one" ? (
        <Stack spacing={1.25}>
          {pool.options.map((option, index) => {
            const sourceOption = sourceWeightedOptions?.[index];
            return (
            <Stack key={index} spacing={1} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <FormControlLabel
                  control={<Switch checked={option.reward === null} onChange={(_event, empty) => onChange({ mode: "weighted_one", options: pool.options.map((current, currentIndex) => currentIndex === index ? { ...current, reward: empty ? null : createAmount(resources) } : current) })} disabled={disabled || !resources.length} />}
                  label="Без награды"
                />
                <IconButton aria-label="Удалить вариант" onClick={() => onChange({ mode: "weighted_one", options: pool.options.filter((_option, currentIndex) => currentIndex !== index) })} disabled={disabled} color="error"><DeleteOutlineRoundedIcon /></IconButton>
              </Stack>
              {option.reward ? <ResourceAmountFields amount={option.reward} sourceAmount={sourceOption?.reward ?? undefined} trackChanges={trackChanges} resources={resources} disabled={disabled} onChange={(reward) => onChange({ mode: "weighted_one", options: pool.options.map((current, currentIndex) => currentIndex === index ? { ...current, reward } : current) })} /> : null}
              <AppTextInput size="small" type="number" label="Вес" value={option.weight} changed={trackChanges && (!sourceOption || sourceOption.weight !== option.weight)} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => onChange({ mode: "weighted_one", options: pool.options.map((current, currentIndex) => currentIndex === index ? { ...current, weight: Number(event.target.value) } : current) })} sx={{ maxWidth: 180 }} />
            </Stack>
            );
          })}
          <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => {
            const addedResourceIds = pool.options.flatMap((option) => option.reward ? [option.reward.resourceId] : []);
            onChange({ mode: "weighted_one", options: [...pool.options, { reward: createAmount(resources, addedResourceIds), weight: 1 }] });
          }} disabled={disabled || !hasAvailableResource(resources, pool.options.flatMap((option) => option.reward ? [option.reward.resourceId] : []))} sx={{ alignSelf: "flex-start" }}>Добавить вариант</AppPillButton>
        </Stack>
      ) : null}

      {pool.mode === "independent" ? (
        <Stack spacing={1.25}>
          {pool.options.map((option, index) => {
            const sourceOption = sourceIndependentOptions?.[index];
            return (
            <Stack key={`${option.reward.resourceId}-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
              <ResourceAmountFields amount={option.reward} sourceAmount={sourceOption?.reward} trackChanges={trackChanges} resources={resources} disabled={disabled} onChange={(reward) => onChange({ mode: "independent", options: pool.options.map((current, currentIndex) => currentIndex === index ? { ...current, reward } : current) })} />
              <AppTextInput size="small" type="number" label="Шанс, %" value={option.chanceBps / 100} changed={trackChanges && (!sourceOption || sourceOption.chanceBps !== option.chanceBps)} disabled={disabled} inputProps={{ min: 0, max: 100, step: 0.01 }} onChange={(event) => onChange({ mode: "independent", options: pool.options.map((current, currentIndex) => currentIndex === index ? { ...current, chanceBps: Math.round(Number(event.target.value) * 100) } : current) })} sx={{ minWidth: { sm: 150 } }} />
              <IconButton aria-label="Удалить вариант" onClick={() => onChange({ mode: "independent", options: pool.options.filter((_option, currentIndex) => currentIndex !== index) })} disabled={disabled} color="error"><DeleteOutlineRoundedIcon /></IconButton>
            </Stack>
            );
          })}
          <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => {
            const addedResourceIds = pool.options.map((option) => option.reward.resourceId);
            onChange({ mode: "independent", options: [...pool.options, { reward: createAmount(resources, addedResourceIds), chanceBps: 10_000 }] });
          }} disabled={disabled || !hasAvailableResource(resources, pool.options.map((option) => option.reward.resourceId))} sx={{ alignSelf: "flex-start" }}>Добавить вариант</AppPillButton>
        </Stack>
      ) : null}
    </Stack>
  );
}
