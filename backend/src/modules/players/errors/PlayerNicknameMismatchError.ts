import { AppError } from "../../../common/errors";

export class PlayerNicknameMismatchError extends AppError {
  constructor(projectId: string, playerId: string, nickname: string) {
    super(`Player "${playerId}" does not have current nickname "${nickname}" in project "${projectId}"`, {
      code: "player_nickname_mismatch",
      details: { projectId, playerId, nickname },
      statusCode: 400,
    });
  }
}
