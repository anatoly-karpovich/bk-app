import { NotFoundError } from "../../../common/errors";

export class LottoGameNotFoundError extends NotFoundError {
  constructor(gameId: string) {
    super("Lotto game not found", {
      code: "lotto_game_not_found",
      details: { gameId },
    });
  }
}
