import { AppError } from "../../../common/errors";

export class InvalidBattleshipsGameIdError extends AppError {
  constructor(gameId: string) {
    super("Invalid game id", {
      code: "invalid_battleships_game_id",
      details: { gameId },
      statusCode: 400,
    });
  }
}
