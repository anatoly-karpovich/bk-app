import { AppError } from "../../../common/errors";

export class InvalidLottoGameIdError extends AppError {
  constructor(gameId: string) {
    super(`Invalid Lotto game id: ${gameId}`, {
      code: "invalid_lotto_game_id",
      details: { gameId },
      statusCode: 400,
    });
  }
}
