import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";

export const projectGameConfigsParamsSchema = z.object({ projectId: objectIdSchema });
export const gameConfigsListQuerySchema = z.object({ gameType: z.enum(["journey", "battleships", "lotto", "lotto_bingo"]) });
export const gameConfigIdParamsSchema = projectGameConfigsParamsSchema.extend({ gameConfigId: objectIdSchema });

const gameConfigFieldsSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).default(""),
  rules: z.unknown().refine((value) => value !== undefined, "Rules are required"),
});

export const createGameConfigSchema = gameConfigFieldsSchema.extend({ gameType: z.enum(["journey", "battleships", "lotto", "lotto_bingo"]) });
export const updateGameConfigSchema = gameConfigFieldsSchema;
