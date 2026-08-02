import { useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Box, Card, CardContent, FormControl, FormControlLabel, FormLabel, Grid, IconButton, MenuItem, Radio, RadioGroup, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import { journeyConfigTexts } from "../../../texts/journeyConfigTexts";
import { formatRewardPool } from "../../rewards/resourceAmounts";
import type { JourneyJackpotCountMode, JourneyRules, JourneyRulesCell } from "../../journey/types";
import type { ProjectResource } from "../../projects/types";
import RewardPoolEditor from "./RewardPoolEditor";

function findResource(resources: ProjectResource[], id: string) {
  return resources.find((resource) => resource.id === id);
}

function getStep(resource: ProjectResource | undefined) {
  return resource?.type === "currency" && resource.valueType === "decimal" ? 10 ** -resource.precision : 1;
}

function getCellRewardSummary(cell: JourneyRulesCell, resources: ProjectResource[]) {
  if (cell.rewardPool.mode === "all" && !cell.rewardPool.rewards.length) {
    return journeyConfigTexts.cells.emptyReward;
  }

  return formatRewardPool(cell.rewardPool, resources);
}

export function JourneyJackpotSection({ rules, sourceRules, resources, disabled, onChange }: { rules: JourneyRules; sourceRules?: JourneyRules; resources: ProjectResource[]; disabled: boolean; onChange: (rules: JourneyRules) => void }) {
  const jackpot = rules.jackpot;
  const primaryRewards = jackpot.rewardPool.mode === "all" ? jackpot.rewardPool.rewards : [];
  const primaryReward = primaryRewards[0] ?? null;
  const sourceJackpot = sourceRules?.jackpot;
  const sourcePrimaryReward = sourceJackpot?.rewardPool.mode === "all" ? sourceJackpot.rewardPool.rewards[0] : undefined;
  const updateJackpot = (patch: Partial<JourneyRules["jackpot"]>) => onChange({ ...rules, jackpot: { ...jackpot, ...patch } });

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.25}>
          <Stack spacing={0.5}>
            <Typography variant="h5">Джекпот</Typography>
            <Typography variant="body2" color="text.secondary">Настройка количества сокровищ и пула наград.</Typography>
          </Stack>

          <FormControl disabled={disabled} sx={sourceJackpot && sourceJackpot.countMode !== jackpot.countMode ? { px: 1, py: 0.5, border: "2px solid", borderColor: "primary.main", borderRadius: 2, alignSelf: "flex-start" } : undefined}>
            <FormLabel>Способ расчёта количества</FormLabel>
            <RadioGroup row value={jackpot.countMode} onChange={(event) => updateJackpot({ countMode: event.target.value as JourneyJackpotCountMode })}>
              <FormControlLabel value="fixed" control={<Radio />} label="Фиксированное количество" />
              <FormControlLabel value="by_players" control={<Radio />} label="По числу игроков" />
            </RadioGroup>
          </FormControl>

          <Grid container spacing={2}>
            {jackpot.countMode === "by_players" ? (
              <>
                <Grid item xs={12} md={6}>
                  <AppTextInput fullWidth type="number" label="Игроков на сокровище" value={jackpot.playersPerJackpot} changed={Boolean(sourceJackpot && sourceJackpot.playersPerJackpot !== jackpot.playersPerJackpot)} disabled={disabled} inputProps={{ min: 1 }} onChange={(event) => updateJackpot({ playersPerJackpot: Number(event.target.value) })} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <AppTextInput fullWidth type="number" label="Максимум сокровищ" value={jackpot.count} changed={Boolean(sourceJackpot && sourceJackpot.count !== jackpot.count)} disabled={disabled} inputProps={{ min: 0, max: 7 }} onChange={(event) => updateJackpot({ count: Number(event.target.value) })} />
                </Grid>
              </>
            ) : (
              <Grid item xs={12} md={6}>
                <AppTextInput fullWidth type="number" label="Количество сокровищ" value={jackpot.count} changed={Boolean(sourceJackpot && sourceJackpot.count !== jackpot.count)} disabled={disabled} inputProps={{ min: 0, max: 7 }} onChange={(event) => updateJackpot({ count: Number(event.target.value) })} />
              </Grid>
            )}
          </Grid>

          <Box sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
            {primaryReward ? (
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <AppTextInput select fullWidth size="small" label="Ресурс" value={primaryReward.resourceId} changed={Boolean(sourceJackpot && (!sourcePrimaryReward || sourcePrimaryReward.resourceId !== primaryReward.resourceId))} disabled={disabled} onChange={(event) => updateJackpot({ rewardPool: { mode: "all", rewards: [{ ...primaryReward, resourceId: event.target.value }, ...primaryRewards.slice(1)] } })}>
                  {resources.map((resource) => <MenuItem key={resource.id} value={resource.id}>{resource.label} ({resource.type === "currency" ? "валюта" : "предмет"})</MenuItem>)}
                </AppTextInput>
                <AppTextInput size="small" type="number" label="Количество" value={primaryReward.amount} changed={Boolean(sourceJackpot && (!sourcePrimaryReward || sourcePrimaryReward.amount !== primaryReward.amount))} disabled={disabled} inputProps={{ step: getStep(findResource(resources, primaryReward.resourceId)) }} onChange={(event) => updateJackpot({ rewardPool: { mode: "all", rewards: [{ ...primaryReward, amount: Number(event.target.value) }, ...primaryRewards.slice(1)] } })} sx={{ minWidth: { md: 190 } }} />
              </Stack>
            ) : (
              <RewardPoolEditor pool={jackpot.rewardPool} sourcePool={sourceJackpot?.rewardPool} resources={resources} disabled={disabled} onChange={(rewardPool) => updateJackpot({ rewardPool })} />
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function JourneyCellsSection({ rules, sourceRules, resources, disabled, onChange }: { rules: JourneyRules; sourceRules?: JourneyRules; resources: ProjectResource[]; disabled: boolean; onChange: (rules: JourneyRules) => void }) {
  const [selectedKey, setSelectedKey] = useState(() => `${rules.cells[0]?.kind}:${rules.cells[0]?.id}`);
  const selectedIndex = useMemo(() => rules.cells.findIndex((cell) => `${cell.kind}:${cell.id}` === selectedKey), [rules.cells, selectedKey]);
  const selected = rules.cells[selectedIndex] ?? rules.cells[0];
  const selectedRewards = selected?.rewardPool.mode === "all" ? selected.rewardPool.rewards : null;
  const sourceSelected = selectedIndex >= 0 ? sourceRules?.cells[selectedIndex] : undefined;
  const sourceSelectedRewards = sourceSelected?.rewardPool.mode === "all" ? sourceSelected.rewardPool.rewards : undefined;
  const groups = ["bonus", "trap"] as const;

  useEffect(() => {
    if (selected) {
      setSelectedKey(`${selected.kind}:${selected.id}`);
    }
  }, [selected?.id, selected?.kind]);

  function update(index: number, patch: Partial<JourneyRulesCell>) {
    const current = rules.cells[index];
    const next = { ...current, ...patch };
    onChange({ ...rules, cells: rules.cells.map((cell, cellIndex) => cellIndex === index ? next : cell) });
    if (index === selectedIndex) {
      setSelectedKey(`${next.kind}:${next.id}`);
    }
  }

  function addCell() {
    const next = { id: `cell_${Date.now()}`, kind: "bonus" as const, mapLabel: "X", count: 1, rewardPool: { mode: "all" as const, rewards: [] } };
    onChange({ ...rules, cells: [...rules.cells, next] });
    setSelectedKey(`${next.kind}:${next.id}`);
  }

  const isCoreCell = Boolean(selected && ["small", "medium", "large"].includes(selected.id));

  return (
    <Stack spacing={2.25}>
      <Card>
        <CardContent>
          <Stack spacing={2.25}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "flex-start" }}>
              <Box>
                <Typography variant="h5">{journeyConfigTexts.cells.title}</Typography>
                <Typography variant="body2" color="text.secondary">{journeyConfigTexts.cells.description}</Typography>
              </Box>
              <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={disabled} onClick={addCell}>
                {journeyConfigTexts.cells.addCell}
              </AppPillButton>
            </Stack>

            <Grid container spacing={2}>
              {groups.map((kind) => {
                const group = journeyConfigTexts.cells.groups[kind];
                return (
                  <Grid key={kind} item xs={12} md={6}>
                    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography fontWeight={700}>{group.title}</Typography>
                          <Typography variant="caption" color={kind === "bonus" ? "success.main" : "error.main"}>{group.status}</Typography>
                        </Stack>
                        {rules.cells.filter((cell) => cell.kind === kind).map((cell) => {
                          const key = `${cell.kind}:${cell.id}`;
                          const isSelected = key === `${selected?.kind}:${selected?.id}`;
                          return (
                            <Box key={key} component="button" type="button" onClick={() => setSelectedKey(key)} sx={{ width: "100%", p: 1.25, border: "1px solid", borderColor: isSelected ? "primary.light" : "divider", borderRadius: 1.5, bgcolor: isSelected ? "rgba(79,70,229,.06)" : "background.paper", color: "text.primary", display: "grid", gridTemplateColumns: "38px minmax(0, 1fr)", gap: 1.25, alignItems: "center", textAlign: "left", cursor: "pointer" }}>
                              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: "grid", placeItems: "center", fontWeight: 700, bgcolor: kind === "bonus" ? "rgba(34, 197, 94, .14)" : "rgba(239, 68, 68, .14)", color: kind === "bonus" ? "success.main" : "error.main" }}>
                                {cell.mapLabel}
                              </Box>
                              <Box>
                                <Typography variant="subtitle2">{journeyConfigTexts.cells.name(cell.kind, cell.id)}</Typography>
                                <Typography variant="caption" color="text.secondary">{cell.count} клеток · {getCellRewardSummary(cell, resources)}</Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between">
                <Box>
                  <Typography variant="overline" color="primary.main">{journeyConfigTexts.cells.selectedEyebrow}</Typography>
                  <Typography variant="h5">{journeyConfigTexts.cells.name(selected.kind, selected.id)}</Typography>
                </Box>
                <IconButton color="error" disabled={disabled || isCoreCell} onClick={() => onChange({ ...rules, cells: rules.cells.filter((_cell, index) => index !== selectedIndex) })}>
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Stack>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.5fr 1fr .7fr 1fr" }, gap: 1.5 }}>
                <AppTextInput fullWidth size="small" label="Идентификатор" value={selected.id} changed={Boolean(sourceRules && (!sourceSelected || sourceSelected.id !== selected.id))} disabled={disabled || isCoreCell} onChange={(event) => update(selectedIndex, { id: event.target.value })} />
                <AppTextInput select fullWidth size="small" label="Тип" value={selected.kind} changed={Boolean(sourceRules && (!sourceSelected || sourceSelected.kind !== selected.kind))} disabled={disabled || isCoreCell} onChange={(event) => update(selectedIndex, { kind: event.target.value as JourneyRulesCell["kind"] })}>
                  <MenuItem value="bonus">Бонус</MenuItem>
                  <MenuItem value="trap">Ловушка</MenuItem>
                </AppTextInput>
                <AppTextInput fullWidth size="small" label="Метка" value={selected.mapLabel} changed={Boolean(sourceRules && (!sourceSelected || sourceSelected.mapLabel !== selected.mapLabel))} disabled={disabled} onChange={(event) => update(selectedIndex, { mapLabel: event.target.value })} />
                <AppTextInput fullWidth size="small" type="number" label="Количество" value={selected.count} changed={Boolean(sourceRules && (!sourceSelected || sourceSelected.count !== selected.count))} disabled={disabled} onChange={(event) => update(selectedIndex, { count: Number(event.target.value) })} />
              </Box>

              {selectedRewards ? (
                <Stack spacing={1}>
                  {selectedRewards.map((reward, index) => (
                    <Stack key={`${reward.resourceId}-${index}`} direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                      <AppTextInput select fullWidth size="small" label="Ресурс" value={reward.resourceId} changed={Boolean(sourceRules && (!sourceSelectedRewards?.[index] || sourceSelectedRewards[index].resourceId !== reward.resourceId))} disabled={disabled} onChange={(event) => update(selectedIndex, { rewardPool: { mode: "all", rewards: selectedRewards.map((current, currentIndex) => currentIndex === index ? { ...current, resourceId: event.target.value } : current) } })}>
                        {resources.map((resource) => <MenuItem key={resource.id} value={resource.id} disabled={resource.id !== reward.resourceId && selectedRewards.some((current) => current.resourceId === resource.id)}>{resource.label} ({resource.type === "currency" ? "валюта" : "предмет"})</MenuItem>)}
                      </AppTextInput>
                      <AppTextInput size="small" type="number" label="Количество" value={reward.amount} changed={Boolean(sourceRules && (!sourceSelectedRewards?.[index] || sourceSelectedRewards[index].amount !== reward.amount))} disabled={disabled} inputProps={{ step: getStep(findResource(resources, reward.resourceId)) }} onChange={(event) => update(selectedIndex, { rewardPool: { mode: "all", rewards: selectedRewards.map((current, currentIndex) => currentIndex === index ? { ...current, amount: Number(event.target.value) } : current) } })} sx={{ minWidth: { md: 190 }}} />
                      <IconButton color="error" disabled={disabled} onClick={() => update(selectedIndex, { rewardPool: { mode: "all", rewards: selectedRewards.filter((_current, currentIndex) => currentIndex !== index) } })}>
                        <DeleteOutlineRoundedIcon />
                      </IconButton>
                    </Stack>
                  ))}
                  <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={disabled || selectedRewards.length >= resources.length} onClick={() => {
                    const resource = resources.find((candidate) => !selectedRewards.some((reward) => reward.resourceId === candidate.id));
                    if (resource) update(selectedIndex, { rewardPool: { mode: "all", rewards: [...selectedRewards, { resourceId: resource.id, amount: 1 }] } });
                  }} sx={{ alignSelf: "flex-start" }}>
                    {journeyConfigTexts.cells.addResource}
                  </AppPillButton>
                </Stack>
              ) : (
                <RewardPoolEditor pool={selected.rewardPool} sourcePool={sourceSelected?.rewardPool} resources={resources} disabled={disabled} onChange={(rewardPool) => update(selectedIndex, { rewardPool })} />
              )}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
