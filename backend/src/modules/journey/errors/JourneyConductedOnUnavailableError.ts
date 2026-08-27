import { AppError } from "../../../common/errors";

export class JourneyConductedOnUnavailableError extends AppError {
  constructor() {
    super("Conducted date can be changed only after a Journey game is finished", {
      code: "journey_conducted_on_requires_finished_game",
      statusCode: 409,
    });
  }
}
