import { AppError } from "../../../common/errors";

export class LottoBingoConductedOnUnavailableError extends AppError {
  constructor() {
    super("The conducted date can be changed only after Lotto Bingo is finished", {
      statusCode: 409,
      code: "lotto_bingo_conducted_on_requires_finished_game",
    });
  }
}
