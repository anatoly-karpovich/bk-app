import { NotFoundError } from "../../../common/errors";

export class BattleshipsGamesNotFoundError extends NotFoundError {
  constructor(status?: string) {
    super("No battleships games found", {
      code: "battleships_games_not_found",
      details: { status },
    });
  }
}
