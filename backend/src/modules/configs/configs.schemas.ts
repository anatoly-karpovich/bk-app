import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";

const singleDecimalNonNegativeSchema = z
  .number()
  .nonnegative()
  .refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < Number.EPSILON * 10, {
    message: "Value must have at most one decimal place",
  });

const halfStepNonNegativeSchema = z
  .number()
  .nonnegative()
  .refine((value) => Math.abs(value * 2 - Math.round(value * 2)) < Number.EPSILON * 10, {
    message: "Value must be in 0.5 increments",
  });

const integerNonNegativeSchema = z.number().int().nonnegative();

const configCurrencyValueSchema = z.object({
  currencyId: z.string().trim().min(1),
  value: z.number(),
});

function hasMixedSigns(values: Array<{ value: number }>) {
  const hasPositive = values.some((value) => value.value > 0);
  const hasNegative = values.some((value) => value.value < 0);
  return hasPositive && hasNegative;
}

function createRewardSetSchema(valueSchema: z.ZodType<number>, options: { allowNegative: boolean }) {
  const { allowNegative } = options;

  return z
    .array(configCurrencyValueSchema.extend({ value: valueSchema }))
    .min(1)
    .refine(
      (values) => new Set(values.map((value) => value.currencyId)).size === values.length,
      "Reward currencies must be unique inside one reward set",
    )
    .refine((values) => !hasMixedSigns(values), "Positive and negative rewards cannot be mixed")
    .refine((values) => values.some((value) => value.value !== 0), "At least one reward value must be non-zero")
    .refine(
      (values) => allowNegative || values.every((value) => value.value >= 0),
      allowNegative ? "Reward values are invalid" : "Rewards must be non-negative",
    );
}

const journeyRewardsSchema = createRewardSetSchema(z.number().int(), { allowNegative: true });
const journeyPositiveRewardsSchema = createRewardSetSchema(integerNonNegativeSchema, { allowNegative: false });
const lottoRewardsSchema = createRewardSetSchema(integerNonNegativeSchema, { allowNegative: false });
const battleshipsShootRewardsSchema = createRewardSetSchema(singleDecimalNonNegativeSchema, { allowNegative: false });
const battleshipsDestroyRewardsSchema = createRewardSetSchema(halfStepNonNegativeSchema, { allowNegative: false });

const journeyAchievementSchema = z.object({
  rewards: journeyPositiveRewardsSchema,
});

const journeyCellSchema = z
  .object({
    id: z.string().trim().min(1),
    kind: z.enum(["bonus", "trap"]),
    rewards: journeyRewardsSchema,
    count: z.number().int().positive(),
  })
  .superRefine((cell, context) => {
    if (cell.kind === "bonus" && cell.rewards.some((reward) => reward.value < 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bonus cell rewards must be non-negative",
        path: ["rewards"],
      });
    }

    if (cell.kind === "trap" && cell.rewards.some((reward) => reward.value > 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Trap cell rewards must be non-positive",
        path: ["rewards"],
      });
    }
  });

const journeyConfigSchema = z.object({
  initialRewards: journeyPositiveRewardsSchema,
  minDice: z.number().int().positive(),
  maxDice: z.number().int().positive(),
  maxPrizes: journeyPositiveRewardsSchema.nullable(),
  mapSize: z.number().int().positive(),
  jackpot: z.object({
    count: z.number().int().positive(),
    rewards: journeyPositiveRewardsSchema,
  }),
  cells: z.array(journeyCellSchema).min(1),
  achievements: z.object({
    unlucky: journeyAchievementSchema,
    careful: journeyAchievementSchema,
    collector: journeyAchievementSchema,
    lucky: journeyAchievementSchema,
  }),
});

const battleshipsShipSchema = z.object({
  size: z.number().int().positive(),
  amount: z.number().int().nonnegative(),
});

const battleshipsBoardConfigSchema = z.object({
  boardSize: z.number().int().positive(),
  ships: z.array(battleshipsShipSchema),
  maxShots: z.number().int().nonnegative(),
  prizes: z.object({
    shoot: battleshipsShootRewardsSchema,
    destroyBonus: z.record(z.string(), battleshipsDestroyRewardsSchema),
  }),
});

const battleshipsConfigSchema = z.object({
  selectedBoardSize: z.number().int().positive(),
  boards: z
    .record(z.string(), battleshipsBoardConfigSchema)
    .refine((boards) => Object.keys(boards).length > 0, "At least one battleships board is required"),
});

const lottoConfigSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
  cardNumbersAmount: z.number().int().positive(),
  firstPlacePrize: lottoRewardsSchema,
  secondPlacePrize: lottoRewardsSchema,
  otherActivePlayersPrize: lottoRewardsSchema,
  rewardDistributionMode: z.enum(["full_per_winner", "split_pool"]),
});

const configCurrencySchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

export const configIdParamsSchema = z.object({
  configId: objectIdSchema,
});

export const appConfigMutationSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string(),
  currencies: z
    .array(configCurrencySchema)
    .min(1)
    .refine(
      (currencies) => new Set(currencies.map((currency) => currency.id)).size === currencies.length,
      "Currency ids must be unique",
    ),
  games: z.object({
    journey: journeyConfigSchema,
    battleships: battleshipsConfigSchema,
    lotto: lottoConfigSchema,
  }),
});
