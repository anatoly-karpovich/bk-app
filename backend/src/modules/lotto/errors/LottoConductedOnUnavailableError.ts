import { AppError } from "../../../common/errors";

export class LottoConductedOnUnavailableError extends AppError {
  constructor() {
    super("Conducted date can be changed only after a Lotto game is finished", {
      code: "lotto_conducted_on_requires_finished_game",
      statusCode: 409,
    });
  }
}
