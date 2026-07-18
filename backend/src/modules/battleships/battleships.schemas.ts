import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";

export const battleshipsGameIdParamsSchema = z.object({
  gameId: z.string().trim().min(1),
});

export const createBattleshipsGamePlayerNameSchema = z.object({
  playerName: z.string().trim().min(1),
});

export const createBattleshipsGameConfigSchema = z.object({
  configId: objectIdSchema,
});

export const createBattleshipsGameDjNameSchema = z.object({
  djName: z.string().optional(),
});

export const battleshipsShotSchema = z.object({
  row: z.number().int().positive(),
  column: z.number().int().positive(),
});

export const latestBattleshipsGameQuerySchema = z.object({
  status: z.enum(["in_progress", "finished"]).optional(),
});
