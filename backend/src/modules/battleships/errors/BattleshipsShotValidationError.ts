import { AppError } from "../../../common/errors";

export class BattleshipsShotValidationError extends AppError {
  constructor(message: string) {
    super(message, {
      code: "battleships_shot_validation_error",
      statusCode: 400,
    });
  }
}
