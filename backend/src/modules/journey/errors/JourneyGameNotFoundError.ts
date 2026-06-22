import { NotFoundError } from "../../../common/errors";

export class JourneyGameNotFoundError extends NotFoundError {
  constructor(gameId: string) {
    super("Journey game not found", {
      code: "journey_game_not_found",
      details: { gameId },
    });
  }
}
