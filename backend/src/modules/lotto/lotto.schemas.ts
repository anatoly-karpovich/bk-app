import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";

export const lottoGameIdParamsSchema = z.object({
  gameId: z.string().trim().min(1),
});

export const lottoPlayerIdParamsSchema = z.object({
  playerId: z.string().trim().min(1),
});

export const createLottoGameConfigSchema = z.object({
  configId: objectIdSchema,
});

export const createLottoGameProjectParamsSchema = z.object({
  projectId: objectIdSchema,
});

export const createLottoGamePresetSchema = z.object({
  gameConfigId: objectIdSchema,
});

export const createLottoGameDjNameSchema = z.object({
  djName: z.string().optional(),
});

export const createLottoGamePlayerSchema = z.object({
  nickname: z.string().trim().min(1),
  playerRefId: objectIdSchema.nullable().optional(),
  cardNumbers: z.array(z.number().int()).min(1),
});

export const createLottoGamePlayersSchema = z.object({
  players: z.array(createLottoGamePlayerSchema).min(1),
});

export const latestLottoGameQuerySchema = z.object({
  status: z.enum(["in_progress", "finished"]).optional(),
});
