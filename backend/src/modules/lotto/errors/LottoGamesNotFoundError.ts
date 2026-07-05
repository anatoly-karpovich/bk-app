import { NotFoundError } from "../../../common/errors";
import type { LottoGameStatus } from "../domain/types";

export class LottoGamesNotFoundError extends NotFoundError {
  constructor(status?: LottoGameStatus) {
    super("Lotto games not found", {
      code: "lotto_games_not_found",
      details: { status: status ?? null },
    });
  }
}
