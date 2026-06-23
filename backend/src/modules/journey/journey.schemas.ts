import { z } from "zod";

export const journeyGameIdParamsSchema = z.object({
  gameId: z.string().trim().min(1),
});

export const journeyPlayerParamsSchema = z.object({
  gameId: z.string().trim().min(1),
  playerId: z.string().trim().min(1),
});

export const createJourneyGameNicknamesSchema = z.object({
  nicknames: z.array(z.string()).min(1),
});

export const createJourneyGameConfigSchema = z.object({
  configId: z.string().trim().min(1),
});

export const createJourneyGameDjNameSchema = z.object({
  djName: z.string().optional(),
});

export const journeyMoveInputSchema = z.object({
  playerId: z.string(),
  dice: z.number(),
});

export const journeyRoundMovesSchema = z.object({
  moves: z.array(journeyMoveInputSchema),
});

export const journeyRoundSkippedPlayerIdsSchema = z.object({
  skippedPlayerIds: z.array(z.string()).optional(),
});

export const latestJourneyGameQuerySchema = z.object({
  status: z.enum(["in_progress", "finished"]).optional(),
});

export const journeyParsePlayersSchema = z.object({
  text: z.string(),
  djName: z.string().optional(),
});

export const journeyParseMovesTextSchema = z.object({
  text: z.string(),
});
