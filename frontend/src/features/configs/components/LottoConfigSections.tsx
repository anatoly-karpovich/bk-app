import { useMemo } from "react";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LooksOneRoundedIcon from "@mui/icons-material/LooksOneRounded";
import LooksTwoRoundedIcon from "@mui/icons-material/LooksTwoRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import { Box, Card, CardContent, FormControl, Grid, Radio, RadioGroup, Stack, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppTextInput from "../../../components/ui/AppTextInput";
import { lottoConfigTexts } from "../../../texts/lottoConfigTexts";
import { generateLottoCardNumbers } from "../../lotto/mappers/lotto.mapper";
import type { LottoRules } from "../../lotto/types";
import type { ProjectResource } from "../../projects/types";
import RewardPoolSummaryChip from "../../rewards/components/RewardPoolSummaryChip";
import type { RewardPool } from "../../rewards/types";
import RewardPoolEditor from "./RewardPoolEditor";
import ConfigContextChip from "./ConfigContextChip";
import RuleSection from "./RuleSection";

interface LottoRulesSectionProps {
  rules: LottoRules;
  sourceRules: LottoRules;
  resources: ProjectResource[];
  disabled: boolean;
  onChange: (rules: LottoRules) => void;
}

function patchRules(rules: LottoRules, onChange: (rules: LottoRules) => void, patch: Partial<LottoRules>) {
  onChange({ ...rules, ...patch });
}

export function LottoCardRulesSection({ rules, sourceRules, disabled, onChange }: LottoRulesSectionProps) {
  const previewNumbers = useMemo(
    () => generateLottoCardNumbers(rules),
    [rules.cardNumbersAmount, rules.max, rules.min],
  );

  return (
    <RuleSection title={lottoConfigTexts.card.title} description={lottoConfigTexts.card.description}>
      <Stack spacing={2.25}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <AppTextInput
              fullWidth
              type="number"
              label={lottoConfigTexts.card.min}
              value={rules.min}
              changed={rules.min !== sourceRules.min}
              disabled={disabled}
              inputProps={{ min: 1, step: 1 }}
              onChange={(event) => patchRules(rules, onChange, { min: Number(event.target.value) })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <AppTextInput
              fullWidth
              type="number"
              label={lottoConfigTexts.card.max}
              value={rules.max}
              changed={rules.max !== sourceRules.max}
              disabled={disabled}
              inputProps={{ min: 1, step: 1 }}
              onChange={(event) => patchRules(rules, onChange, { max: Number(event.target.value) })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <AppTextInput
              fullWidth
              type="number"
              label={lottoConfigTexts.card.cardNumbersAmount}
              value={rules.cardNumbersAmount}
              changed={rules.cardNumbersAmount !== sourceRules.cardNumbersAmount}
              disabled={disabled}
              inputProps={{ min: 1, step: 1 }}
              onChange={(event) => patchRules(rules, onChange, { cardNumbersAmount: Number(event.target.value) })}
            />
          </Grid>
        </Grid>

        <Card variant="outlined" sx={{ boxShadow: "none", bgcolor: "rgba(248, 250, 252, 0.8)" }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack spacing={0.75}>
                <ConfigContextChip
                  label={lottoConfigTexts.card.previewBadge}
                  icon={<PreviewRoundedIcon fontSize="small" />}
                />
                <Typography variant="subtitle1" fontWeight={700}>
                  {lottoConfigTexts.card.previewTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {lottoConfigTexts.card.previewDescription(rules.cardNumbersAmount, rules.min, rules.max)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {previewNumbers.map((number) => (
                  <AppChip key={number} size="small" label={number} color="primary" variant="outlined" />
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </RuleSection>
  );
}

interface LottoPrizeEditorCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  pool: RewardPool;
  sourcePool: RewardPool;
  resources: ProjectResource[];
  disabled: boolean;
  emphasized?: boolean;
  onChange: (pool: RewardPool) => void;
}

function LottoPrizeEditorCard({
  title,
  description,
  icon,
  pool,
  sourcePool,
  resources,
  disabled,
  emphasized = false,
  onChange,
}: LottoPrizeEditorCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        boxShadow: "none",
        borderColor: emphasized ? "primary.light" : "divider",
        bgcolor: emphasized ? "rgba(79, 70, 229, 0.035)" : "background.paper",
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.25} justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  bgcolor: emphasized ? "primary.main" : "rgba(8, 145, 178, 0.12)",
                  color: emphasized ? "primary.contrastText" : "secondary.dark",
                }}
              >
                {icon}
              </Box>
              <Stack spacing={0.25}>
                <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
                <Typography variant="body2" color="text.secondary">{description}</Typography>
              </Stack>
            </Stack>
            <RewardPoolSummaryChip pool={pool} resources={resources} color="primary" />
          </Stack>
          <RewardPoolEditor
            pool={pool}
            sourcePool={sourcePool}
            resources={resources}
            disabled={disabled}
            emptyLabel={lottoConfigTexts.prizes.emptyPrize}
            onChange={onChange}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function LottoPrizesSection({ rules, sourceRules, resources, disabled, onChange }: LottoRulesSectionProps) {
  return (
    <RuleSection title={lottoConfigTexts.prizes.title} description={lottoConfigTexts.prizes.description}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <LottoPrizeEditorCard
            {...lottoConfigTexts.prizes.firstPlace}
            icon={<LooksOneRoundedIcon fontSize="small" />}
            pool={rules.firstPlacePrize}
            sourcePool={sourceRules.firstPlacePrize}
            resources={resources}
            disabled={disabled}
            emphasized
            onChange={(firstPlacePrize) => patchRules(rules, onChange, { firstPlacePrize })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <LottoPrizeEditorCard
            {...lottoConfigTexts.prizes.secondPlace}
            icon={<LooksTwoRoundedIcon fontSize="small" />}
            pool={rules.secondPlacePrize}
            sourcePool={sourceRules.secondPlacePrize}
            resources={resources}
            disabled={disabled}
            onChange={(secondPlacePrize) => patchRules(rules, onChange, { secondPlacePrize })}
          />
        </Grid>
        <Grid item xs={12}>
          <LottoPrizeEditorCard
            {...lottoConfigTexts.prizes.otherPlayers}
            icon={<GroupsRoundedIcon fontSize="small" />}
            pool={rules.otherActivePlayersPrize}
            sourcePool={sourceRules.otherActivePlayersPrize}
            resources={resources}
            disabled={disabled}
            onChange={(otherActivePlayersPrize) => patchRules(rules, onChange, { otherActivePlayersPrize })}
          />
        </Grid>
      </Grid>
    </RuleSection>
  );
}

export function LottoDistributionSection({ rules, sourceRules, disabled, onChange }: LottoRulesSectionProps) {
  const options = [
    { value: "full_per_winner", icon: <EmojiEventsRoundedIcon fontSize="small" />, ...lottoConfigTexts.distribution.full },
    { value: "split_pool", icon: <GroupsRoundedIcon fontSize="small" />, ...lottoConfigTexts.distribution.split },
  ] as const;

  return (
    <RuleSection title={lottoConfigTexts.distribution.title} description={lottoConfigTexts.distribution.description}>
      <FormControl component="fieldset" fullWidth disabled={disabled}>
        <RadioGroup
          value={rules.rewardDistributionMode}
          onChange={(event) => patchRules(rules, onChange, { rewardDistributionMode: event.target.value as LottoRules["rewardDistributionMode"] })}
        >
          <Stack spacing={1.25}>
            {options.map((option) => {
              const selected = option.value === rules.rewardDistributionMode;
              return (
                <Box
                  key={option.value}
                  component="label"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "auto 38px minmax(0, 1fr)",
                    gap: 1.25,
                    alignItems: "center",
                    p: 1.5,
                    border: "1px solid",
                    borderColor: selected ? "primary.light" : "divider",
                    borderRadius: 2,
                    bgcolor: selected ? "rgba(79, 70, 229, 0.06)" : "background.paper",
                    cursor: disabled ? "default" : "pointer",
                  }}
                >
                  <Radio value={option.value} checked={selected} />
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 1.5,
                      bgcolor: "rgba(8, 145, 178, 0.12)",
                      color: "secondary.dark",
                    }}
                  >
                    {option.icon}
                  </Box>
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle2">{option.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{option.description}</Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </RadioGroup>
      </FormControl>
      {rules.rewardDistributionMode !== sourceRules.rewardDistributionMode ? (
        <AppInfoAlert>Изменённое правило будет применено только после сохранения всего конфига.</AppInfoAlert>
      ) : null}
    </RuleSection>
  );
}
