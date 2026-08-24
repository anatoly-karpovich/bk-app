import { ConflictError } from "../../../common/errors";

export class PlayerInUseError extends ConflictError {
  constructor(projectId: string, playerId: string) {
    super(`Player "${playerId}" cannot be deleted because it is used in saved games`, {
      code: "player_in_use",
      details: { projectId, playerId },
    });
  }
}
