import { NotFoundError } from "../../../common/errors";

export class PlayerNotFoundError extends NotFoundError {
  constructor(projectId: string, playerId: string) {
    super(`Player "${playerId}" was not found in project "${projectId}"`, {
      code: "player_not_found",
      details: { projectId, playerId },
    });
  }
}
