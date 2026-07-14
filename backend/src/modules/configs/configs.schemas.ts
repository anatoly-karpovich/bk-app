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

const journeyAchievementSchema = z.object({
  prize: z.number().int().nonnegative(),
});

const journeyCellSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.enum(["bonus", "trap"]),
  value: z.number().int(),
  count: z.number().int().positive(),
});

const journeyConfigSchema = z.object({
  initialPrize: z.number().int().nonnegative(),
  minDice: z.number().int().positive(),
  maxDice: z.number().int().positive(),
  maxPrize: z.number().int().nonnegative().nullable(),
  mapSize: z.number().int().positive(),
  jackpot: z.object({
    count: z.number().int().positive(),
    prize: z.number().int().nonnegative(),
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
    shoot: singleDecimalNonNegativeSchema,
    destroyBonus: z.record(z.string(), halfStepNonNegativeSchema),
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
  firstPlacePrize: z.number().int().nonnegative(),
  secondPlacePrize: z.number().int().nonnegative(),
  otherActivePlayersPrize: z.number().int().nonnegative(),
  rewardDistributionMode: z.enum(["full_per_winner", "split_pool"]),
});

export const configIdParamsSchema = z.object({
  configId: objectIdSchema,
});

export const appConfigMutationSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string(),
  currency: z.string().trim().min(1),
  games: z.object({
    journey: journeyConfigSchema,
    battleships: battleshipsConfigSchema,
    lotto: lottoConfigSchema,
  }),
});
