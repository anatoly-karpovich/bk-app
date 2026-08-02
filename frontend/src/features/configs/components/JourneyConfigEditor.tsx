import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Alert, Box, FormControlLabel, IconButton, MenuItem, Stack, Switch, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import AppTextInput from "../../../components/ui/AppTextInput";
import { journeyConfigTexts } from "../../../texts/journeyConfigTexts";
import type { JourneyRules, ResourceLimit } from "../../journey/types";
import type { ProjectResource } from "../../projects/types";
import RewardPoolSummaryChip from "../../rewards/components/RewardPoolSummaryChip";
import type { JourneyConfigSectionId } from "../types";
import RewardPoolEditor from "./RewardPoolEditor";
import RuleSection from "./RuleSection";

interface JourneyConfigEditorProps {
  rules: JourneyRules;
  sourceRules?: JourneyRules;
  resources: ProjectResource[];
  disabled: boolean;
  onChange: (rules: JourneyRules) => void;
  activeSection?: JourneyConfigSectionId;
}

type AchievementId = keyof JourneyRules["achievements"];

const achievementIds = Object.keys(journeyConfigTexts.achievements.entries) as AchievementId[];

export default function JourneyConfigEditor({
  rules,
  sourceRules,
  resources,
  disabled,
  onChange,
  activeSection,
}: JourneyConfigEditorProps) {
  const hasCompleteRules = Boolean(
    rules.initialRewardPool &&
    rules.jackpot?.rewardPool &&
    Array.isArray(rules.cells) &&
    rules.cells.every((cell) => cell.rewardPool) &&
    achievementIds.every((achievement) => rules.achievements?.[achievement]?.rewardPool),
  );

  if (!hasCompleteRules) {
    return <Alert severity="warning">{journeyConfigTexts.alerts.legacyFormat}</Alert>;
  }

  const achievements = rules.achievements;
  const resourceLimits = rules.resourceLimits ?? [];

  function patchRules(patch: Partial<JourneyRules>) {
    onChange({ ...rules, ...patch });
  }

  function toggleResourceLimits(enabled: boolean) {
    if (!enabled) {
      patchRules({ resourceLimits: [] });
      return;
    }

    const firstResource = resources[0];
    patchRules({ resourceLimits: firstResource ? [{ resourceId: firstResource.id, min: 0, max: 0 }] : [] });
  }

  function updateResourceLimit(index: number, patch: Partial<ResourceLimit>) {
    patchRules({
      resourceLimits: resourceLimits.map((limit, currentIndex) =>
        currentIndex === index ? { ...limit, ...patch } : limit,
      ),
    });
  }

  function addResourceLimit() {
    const usedResourceIds = new Set(resourceLimits.map((limit) => limit.resourceId));
    const resource = resources.find((candidate) => !usedResourceIds.has(candidate.id));
    if (resource) {
      patchRules({ resourceLimits: [...resourceLimits, { resourceId: resource.id, min: 0, max: 0 }] });
    }
  }

  return (
    <Stack spacing={2.25}>
      {!activeSection || activeSection === "map" ? (
        <>
          <RuleSection title="Карта и ход" description="Размер поля и допустимый диапазон броска.">
            <AppResponsiveGrid columns={{ xs: 1, sm: 3 }}>
                <AppTextInput
                  fullWidth
                  type="number"
                  label="Размер карты"
                  value={rules.mapSize}
                  changed={sourceRules?.mapSize !== undefined && sourceRules.mapSize !== rules.mapSize}
                  disabled={disabled}
                  inputProps={{ min: 1, step: 1 }}
                  onChange={(event) => patchRules({ mapSize: Number(event.target.value) })}
                />
                <AppTextInput
                  fullWidth
                  type="number"
                  label="Минимальный бросок"
                  value={rules.minDice}
                  changed={sourceRules?.minDice !== undefined && sourceRules.minDice !== rules.minDice}
                  disabled={disabled}
                  inputProps={{ min: 1, step: 1 }}
                  onChange={(event) => patchRules({ minDice: Number(event.target.value) })}
                />
                <AppTextInput
                  fullWidth
                  type="number"
                  label="Максимальный бросок"
                  value={rules.maxDice}
                  changed={sourceRules?.maxDice !== undefined && sourceRules.maxDice !== rules.maxDice}
                  disabled={disabled}
                  inputProps={{ min: 1, step: 1 }}
                  onChange={(event) => patchRules({ maxDice: Number(event.target.value) })}
                />
            </AppResponsiveGrid>
          </RuleSection>

          <RuleSection title="Лимиты ресурсов" description="Ограничения баланса игрока во время партии.">
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={resourceLimits.length > 0}
                    disabled={disabled || !resources.length}
                    onChange={(_event, enabled) => toggleResourceLimits(enabled)}
                  />
                }
                label="Включить лимиты"
              />
              {resourceLimits.map((limit, index) => {
                const sourceLimit = sourceRules?.resourceLimits[index];
                const resource = resources.find((candidate) => candidate.id === limit.resourceId);
                const step =
                  resource?.type === "currency" && resource.valueType === "decimal"
                    ? 10 ** -(resource.precision ?? 0)
                    : 1;
                return (
                  <Stack
                    key={`${limit.resourceId}-${index}`}
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    alignItems={{ md: "center" }}
                  >
                    <AppTextInput
                      select
                      size="small"
                      label="Ресурс"
                      value={limit.resourceId}
                      changed={Boolean(sourceRules && (!sourceLimit || sourceLimit.resourceId !== limit.resourceId))}
                      disabled={disabled}
                      onChange={(event) => updateResourceLimit(index, { resourceId: event.target.value })}
                      sx={{ minWidth: { md: 240 }, flex: 1 }}
                    >
                      {resources
                        .filter(
                          (candidate) =>
                            candidate.id === limit.resourceId ||
                            !resourceLimits.some(
                              (other, otherIndex) => otherIndex !== index && other.resourceId === candidate.id,
                            ),
                        )
                        .map((candidate) => (
                          <MenuItem key={candidate.id} value={candidate.id}>
                            {candidate.label} ({candidate.type === "currency" ? "валюта" : "предмет"})
                          </MenuItem>
                        ))}
                    </AppTextInput>
                    <AppTextInput
                      size="small"
                      type="number"
                      label="Минимум"
                      value={limit.min ?? ""}
                      changed={Boolean(sourceRules && (!sourceLimit || sourceLimit.min !== limit.min))}
                      disabled={disabled}
                      inputProps={{ min: 0, step }}
                      onChange={(event) =>
                        updateResourceLimit(index, {
                          min: event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                      sx={{ minWidth: { md: 150 } }}
                    />
                    <AppTextInput
                      size="small"
                      type="number"
                      label="Максимум"
                      value={limit.max ?? ""}
                      changed={Boolean(sourceRules && (!sourceLimit || sourceLimit.max !== limit.max))}
                      disabled={disabled}
                      inputProps={{ min: 0, step }}
                      onChange={(event) =>
                        updateResourceLimit(index, {
                          max: event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                      sx={{ minWidth: { md: 150 } }}
                    />
                    <IconButton
                      aria-label="Удалить лимит ресурса"
                      color="error"
                      onClick={() =>
                        patchRules({
                          resourceLimits: resourceLimits.filter((_limit, currentIndex) => currentIndex !== index),
                        })
                      }
                      disabled={disabled}
                    >
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  </Stack>
                );
              })}
              {resourceLimits.length > 0 && resourceLimits.length < resources.length ? (
                <AppPillButton
                  size="small"
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  onClick={addResourceLimit}
                  disabled={disabled}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Добавить лимит
                </AppPillButton>
              ) : null}
            </Stack>
          </RuleSection>
        </>
      ) : null}

      {!activeSection || activeSection === "rewards" ? (
        <RuleSection
          title="Стартовые награды"
          description="Ресурсы, которые получает каждый игрок при старте."
          headerAction={<RewardPoolSummaryChip pool={rules.initialRewardPool} resources={resources} color="primary" />}
        >
          <RewardPoolEditor
            pool={rules.initialRewardPool}
            sourcePool={sourceRules?.initialRewardPool}
            resources={resources}
            disabled={disabled}
            modeDisabled
            modeHelperText={"Фиксировано правилами."}
            onChange={(initialRewardPool) => patchRules({ initialRewardPool })}
            emptyLabel="Стартовая награда не задана."
          />
        </RuleSection>
      ) : null}

      {!activeSection || activeSection === "achievements" ? (
        <RuleSection
          title={journeyConfigTexts.achievements.title}
          description={journeyConfigTexts.achievements.description}
        >
          <AppResponsiveGrid columns={{ xs: 1, md: 2 }}>
            {achievementIds.map((achievement) => {
              const copy = journeyConfigTexts.achievements.entries[achievement];
              return (
                <Stack key={achievement} spacing={1.25} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                    <Stack spacing={0.25}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {copy.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {copy.condition}
                      </Typography>
                    </Stack>
                    <RewardPoolSummaryChip pool={achievements[achievement].rewardPool} resources={resources} color="primary" />
                  </Stack>
                  <RewardPoolEditor
                    pool={achievements[achievement].rewardPool}
                    sourcePool={sourceRules?.achievements[achievement]?.rewardPool}
                    resources={resources}
                    disabled={disabled}
                    onChange={(rewardPool) =>
                      patchRules({ achievements: { ...achievements, [achievement]: { rewardPool } } })
                    }
                  />
                </Stack>
              );
            })}
          </AppResponsiveGrid>
        </RuleSection>
      ) : null}
    </Stack>
  );
}
