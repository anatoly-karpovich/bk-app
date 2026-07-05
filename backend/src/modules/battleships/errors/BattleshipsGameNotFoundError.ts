import { NotFoundError } from "../../../common/errors";

export class BattleshipsGameNotFoundError extends NotFoundError {
  constructor(gameId: string) {
    super("Battleships game not found", {
      code: "battleships_game_not_found",
      details: { gameId },
    });
  }
}
