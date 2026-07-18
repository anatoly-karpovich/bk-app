import { AppError } from "../../../common/errors";

export class JourneyRoundValidationError extends AppError {
  constructor(message: string) {
    super(message, {
      code: "journey_round_validation_error",
      statusCode: 400,
    });
  }
}
