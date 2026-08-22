import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";

const nicknameSchema = z.string().trim().min(1).max(80);

export const projectPlayersParamsSchema = z.object({ projectId: objectIdSchema });
export const playerParamsSchema = projectPlayersParamsSchema.extend({ playerId: objectIdSchema });
export const createPlayerSchema = z.object({ nickname: nicknameSchema });
export const updatePlayerSchema = z.object({ nickname: nicknameSchema });
