import { AppError } from "../../../common/errors";

export class InvalidJourneyGameIdError extends AppError {
  constructor(gameId: string) {
    super("Invalid game id", {
      code: "invalid_journey_game_id",
      details: { gameId },
      statusCode: 400,
    });
  }
}
