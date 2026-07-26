import { NotFoundError } from "../../../common/errors";
import type { GameType } from "../domain/types";

export class GameConfigNotFoundError extends NotFoundError {
  constructor(projectId: string, gameConfigId: string, gameType?: GameType) {
    super(`Game config "${gameConfigId}" was not found in project "${projectId}"`, {
      code: "game_config_not_found",
      details: { projectId, gameConfigId, gameType },
    });
  }
}
