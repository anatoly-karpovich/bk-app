import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";
import { isAnalyticsCalendarDate } from "../analytics/domain/occurrenceDate";
export const lottoBingoProjectParamsSchema = z.object({ projectId: objectIdSchema });
export const lottoBingoGameParamsSchema = z.object({ gameId: z.string().trim().min(1) });
export const lottoBingoPlayerParamsSchema = z.object({
  gameId: z.string().trim().min(1),
  playerId: z.string().trim().min(1),
});
export const createLottoBingoGameSchema = z.object({ gameConfigId: objectIdSchema });
export const revisionSchema = z.object({ expectedRevision: z.number().int().nonnegative() });
export const lottoBingoConductedOnSchema = revisionSchema.extend({
  conductedOn: z.string().trim().refine(isAnalyticsCalendarDate, "Expected YYYY-MM-DD calendar date").nullable(),
});
export const addLottoBingoPlayerSchema = revisionSchema.extend({
  nickname: z.string().trim().min(1),
  playerRefId: objectIdSchema.nullable().optional(),
});
export const confirmLottoBingoWinnersSchema = revisionSchema.extend({
  playerIds: z.array(z.string().trim().min(1)).min(1),
});
