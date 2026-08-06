import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Card, CardContent, IconButton, Stack, Typography } from "@mui/material";
import RewardPoolEditor, { createRewardPool } from "../../../configs/components/RewardPoolEditor";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppSegmentedTabs from "../../../../components/ui/AppSegmentedTabs";
import AppTextInput from "../../../../components/ui/AppTextInput";
import type { ProjectResource } from "../../../projects/types";
import type { QuizBonusRule, QuizRegularRewardOverride, QuizRegularRule, QuizRewardPool } from "../types";

interface QuizRewardsEditorProps {
  questionCount: number | null;
  resources: ProjectResource[];
  defaultRule: QuizRegularRule | null;
  overrides: QuizRegularRewardOverride[];
  bonuses: QuizBonusRule[];
  disabled: boolean;
  onChange: (next: { defaultRule: QuizRegularRule | null; overrides: QuizRegularRewardOverride[]; bonuses: QuizBonusRule[] }) => void;
}

const emptyPool = (resources: ProjectResource[]): QuizRewardPool => createRewardPool("all", resources) as QuizRewardPool;
const createDefaultRule = (resources: ProjectResource[]): QuizRegularRule => ({ mode: "all_accepted", rewardPool: emptyPool(resources) });

function RuleEditor({ value, resources, disabled, onChange }: { value: QuizRegularRule; resources: ProjectResource[]; disabled: boolean; onChange: (value: QuizRegularRule) => void }) {
  if (value.mode === "all_accepted") {
    return <Stack spacing={1}>
      <Typography variant="subtitle2">Каждый уникальный принятый ответ получает</Typography>
      <RewardPoolEditor pool={value.rewardPool} resources={resources} disabled={disabled} showModeSelector={false} onChange={(rewardPool) => onChange({ mode: "all_accepted", rewardPool: rewardPool as QuizRewardPool })} />
    </Stack>;
  }

  return <Stack spacing={1.25}>
    <Typography variant="subtitle2">Награды по местам</Typography>
    {value.positionRewards.map((entry, index) => <Card variant="outlined" key={`${entry.position}-${index}`} sx={{ boxShadow: "none", bgcolor: "rgba(248, 250, 252, 0.72)" }}><CardContent>
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">{entry.position} место</Typography>
          <IconButton aria-label="Удалить награду за место" color="error" disabled={disabled} onClick={() => onChange({ ...value, positionRewards: value.positionRewards.filter((_item, itemIndex) => itemIndex !== index) })}><DeleteOutlineRoundedIcon /></IconButton>
        </Stack>
        <AppTextInput type="number" size="small" label="Место" value={entry.position} disabled={disabled} inputProps={{ min: 1 }} onChange={(event) => onChange({ ...value, positionRewards: value.positionRewards.map((item, itemIndex) => itemIndex === index ? { ...item, position: Number(event.target.value) } : item) })} sx={{ maxWidth: 180 }} />
        <RewardPoolEditor pool={entry.rewardPool} resources={resources} disabled={disabled} showModeSelector={false} onChange={(rewardPool) => onChange({ ...value, positionRewards: value.positionRewards.map((item, itemIndex) => itemIndex === index ? { ...item, rewardPool: rewardPool as QuizRewardPool } : item) })} />
      </Stack>
    </CardContent></Card>)}
    <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={disabled} onClick={() => onChange({ ...value, positionRewards: [...value.positionRewards, { position: value.positionRewards.length + 1, rewardPool: emptyPool(resources) }] })} sx={{ alignSelf: "flex-start" }}>Добавить место</AppPillButton>
  </Stack>;
}

export function QuizRegularRewardsEditor({ questionCount, resources, defaultRule, overrides, disabled, onChange }: Omit<QuizRewardsEditorProps, "bonuses"> & { onChange: (next: { defaultRule: QuizRegularRule | null; overrides: QuizRegularRewardOverride[] }) => void }) {
  const update = (next: Partial<{ defaultRule: QuizRegularRule | null; overrides: QuizRegularRewardOverride[] }>) => onChange({ defaultRule, overrides, ...next });
  const availableQuestion = Array.from({ length: questionCount ?? 0 }, (_value, index) => index + 1).find((index) => !overrides.some((item) => item.questionIndex === index)) ?? 1;

  return <Stack spacing={3}>
    <Stack spacing={1.5}>
      <Stack spacing={0.25}><Typography variant="h5">Обычная награда</Typography><Typography variant="body2" color="text.secondary">Правило применяется ко всем вопросам, если для вопроса не задано переопределение.</Typography></Stack>
      {defaultRule ? <>
        <AppSegmentedTabs value={defaultRule.mode} disabled={disabled} tabs={[{ value: "all_accepted", label: "Всем принятым" }, { value: "by_position", label: "По местам" }]} onChange={(mode) => update({ defaultRule: mode === "all_accepted" ? createDefaultRule(resources) : { mode: "by_position", positionRewards: [{ position: 1, rewardPool: emptyPool(resources) }] } })} />
        <RuleEditor value={defaultRule} resources={resources} disabled={disabled} onChange={(nextDefaultRule) => update({ defaultRule: nextDefaultRule })} />
      </> : <AppPillButton disabled={disabled} onClick={() => update({ defaultRule: createDefaultRule(resources) })} sx={{ alignSelf: "flex-start" }}>Добавить правило</AppPillButton>}
    </Stack>
    <Stack spacing={1.25} sx={{ pt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
      <Stack spacing={0.25}><Typography variant="subtitle1">Переопределения по вопросам</Typography><Typography variant="body2" color="text.secondary">Для отдельных вопросов можно заменить обычное правило награды.</Typography></Stack>
      {overrides.map((override, index) => <Card variant="outlined" key={`${override.questionIndex}-${index}`} sx={{ boxShadow: "none" }}><CardContent><Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><AppTextInput type="number" size="small" label="Номер вопроса" value={override.questionIndex} disabled={disabled} inputProps={{ min: 1, max: questionCount ?? undefined }} onChange={(event) => update({ overrides: overrides.map((item, itemIndex) => itemIndex === index ? { ...item, questionIndex: Number(event.target.value) } : item) })} /><IconButton aria-label="Удалить переопределение награды" color="error" disabled={disabled} onClick={() => update({ overrides: overrides.filter((_item, itemIndex) => itemIndex !== index) })}><DeleteOutlineRoundedIcon /></IconButton></Stack>
        <RuleEditor value={override.rule} resources={resources} disabled={disabled} onChange={(rule) => update({ overrides: overrides.map((item, itemIndex) => itemIndex === index ? { ...item, rule } : item) })} />
      </Stack></CardContent></Card>)}
      <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={disabled || !questionCount || overrides.length >= questionCount} onClick={() => update({ overrides: [...overrides, { questionIndex: availableQuestion, rule: createDefaultRule(resources) }] })} sx={{ alignSelf: "flex-start" }}>Добавить переопределение</AppPillButton>
    </Stack>
  </Stack>;
}

export function QuizBonusRulesEditor({ bonuses, selectedQuestionIndex, resources, disabled, onChange }: { bonuses: QuizBonusRule[]; selectedQuestionIndex: number | null; resources: ProjectResource[]; disabled: boolean; onChange: (bonuses: QuizBonusRule[]) => void }) {
  if (!selectedQuestionIndex) return null;
  const selectedBonuses = bonuses.filter((bonus) => bonus.questionIndex === selectedQuestionIndex);
  return <Stack spacing={1.25}>
    {selectedBonuses.map((bonus) => <Card variant="outlined" key={bonus.id} sx={{ boxShadow: "none", bgcolor: "rgba(248, 250, 252, 0.72)" }}><CardContent><Stack spacing={1.25}>
      <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle2">Бонусное правило</Typography><IconButton aria-label="Удалить бонус" color="error" disabled={disabled} onClick={() => onChange(bonuses.filter((item) => item.id !== bonus.id))}><DeleteOutlineRoundedIcon /></IconButton></Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
        <AppTextInput type="number" size="small" label="Какой по счёту верный ответ" value={bonus.position} disabled={disabled} inputProps={{ min: 1 }} onChange={(event) => onChange(bonuses.map((item) => item.id === bonus.id ? { ...item, position: Number(event.target.value) } : item))} sx={{ flex: 1 }} />
      </Stack>
      <RewardPoolEditor pool={bonus.rewardPool} resources={resources} disabled={disabled} showModeSelector={false} onChange={(rewardPool) => onChange(bonuses.map((item) => item.id === bonus.id ? { ...item, rewardPool: rewardPool as QuizRewardPool } : item))} />
    </Stack></CardContent></Card>)}
    <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={disabled} onClick={() => onChange([...bonuses, { id: crypto.randomUUID(), questionIndex: selectedQuestionIndex, position: selectedBonuses.length + 1, rewardPool: emptyPool(resources) }])} sx={{ alignSelf: "flex-start" }}>Бонус</AppPillButton>
  </Stack>;
}

export default function QuizRewardsEditor({ questionCount, resources, defaultRule, overrides, bonuses, disabled, onChange }: QuizRewardsEditorProps) {
  return <Stack spacing={3}>
    <QuizRegularRewardsEditor questionCount={questionCount} resources={resources} defaultRule={defaultRule} overrides={overrides} disabled={disabled} onChange={(next) => onChange({ ...next, bonuses })} />
    <QuizBonusRulesEditor bonuses={bonuses} selectedQuestionIndex={questionCount ? 1 : null} resources={resources} disabled={disabled} onChange={(nextBonuses) => onChange({ defaultRule, overrides, bonuses: nextBonuses })} />
  </Stack>;
}
