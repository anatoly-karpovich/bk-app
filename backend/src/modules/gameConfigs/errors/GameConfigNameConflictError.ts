import { AppError } from "../../../common/errors";
import type { GameType } from "../domain/types";

export class GameConfigNameConflictError extends AppError {
  constructor(projectId: string, gameType: GameType, name: string) {
    super(`Game config "${name}" already exists for ${gameType} in project "${projectId}"`, {
      code: "game_config_name_conflict",
      statusCode: 409,
    });
  }
}
