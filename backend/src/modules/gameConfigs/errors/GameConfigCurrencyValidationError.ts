import { AppError } from "../../../common/errors";

export class GameConfigCurrencyValidationError extends AppError {
  constructor(message: string) {
    super(message, {
      code: "game_config_currency_validation_failed",
      statusCode: 400,
    });
  }
}
