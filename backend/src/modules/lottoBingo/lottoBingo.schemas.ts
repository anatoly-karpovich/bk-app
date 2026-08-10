import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";
export const lottoBingoProjectParamsSchema = z.object({ projectId: objectIdSchema });
export const lottoBingoGameParamsSchema = z.object({ gameId: z.string().trim().min(1) });
export const lottoBingoPlayerParamsSchema = z.object({
  gameId: z.string().trim().min(1),
  playerId: z.string().trim().min(1),
});
export const createLottoBingoGameSchema = z.object({ gameConfigId: objectIdSchema });
export const revisionSchema = z.object({ expectedRevision: z.number().int().nonnegative() });
export const addLottoBingoPlayerSchema = revisionSchema.extend({ nickname: z.string().trim().min(1) });
export const confirmLottoBingoWinnersSchema = revisionSchema.extend({
  playerIds: z.array(z.string().trim().min(1)).min(1),
});
