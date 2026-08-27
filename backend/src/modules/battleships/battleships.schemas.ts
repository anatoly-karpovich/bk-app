import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";
import { isAnalyticsCalendarDate } from "../analytics/domain/occurrenceDate";

export const battleshipsGameIdParamsSchema = z.object({
  gameId: z.string().trim().min(1),
});

export const createBattleshipsGamePlayerNameSchema = z.object({
  playerName: z.string().trim().min(1),
  playerRefId: objectIdSchema.nullable().optional(),
});

export const createBattleshipsGameConfigSchema = z.object({
  configId: objectIdSchema,
});

export const createBattleshipsGameProjectParamsSchema = z.object({
  projectId: objectIdSchema,
});

export const createBattleshipsGamePresetSchema = z.object({
  gameConfigId: objectIdSchema,
});

export const createBattleshipsGameDjNameSchema = z.object({
  djName: z.string().optional(),
});

export const battleshipsShotSchema = z.object({
  row: z.number().int().positive(),
  column: z.number().int().positive(),
});

export const battleshipsConductedOnSchema = z.object({
  conductedOn: z.string().trim().refine(isAnalyticsCalendarDate, "Expected YYYY-MM-DD calendar date").nullable(),
});

export const latestBattleshipsGameQuerySchema = z.object({
  status: z.enum(["in_progress", "finished"]).optional(),
});
