import { ConflictError } from "../../../common/errors";

export class PlayerNicknameConflictError extends ConflictError {
  constructor(projectId: string, nickname: string) {
    super(`Player nickname "${nickname}" is already associated with another player in project "${projectId}"`, {
      code: "player_nickname_conflict",
      details: { projectId, nickname },
    });
  }
}
