import { ConflictError } from "../../../common/errors";

export class PlayerDeletionDisabledError extends ConflictError {
  constructor(projectId: string, playerId: string) {
    super("Player deletion is temporarily disabled while player references are being rolled out", {
      code: "player_deletion_disabled",
      details: { projectId, playerId },
    });
  }
}
