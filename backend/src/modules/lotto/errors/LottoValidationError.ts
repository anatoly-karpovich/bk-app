import { AppError } from "../../../common/errors";

export class LottoValidationError extends AppError {
  constructor(message: string) {
    super(message, {
      code: "lotto_validation_error",
      statusCode: 400,
    });
  }
}
