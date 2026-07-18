import { NotFoundError } from "../../../common/errors";

export class JourneyGamesNotFoundError extends NotFoundError {
  constructor(status?: string) {
    super("No journey games found", {
      code: "journey_games_not_found",
      details: { status },
    });
  }
}
