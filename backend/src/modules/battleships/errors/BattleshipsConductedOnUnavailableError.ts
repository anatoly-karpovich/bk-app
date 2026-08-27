import { AppError } from "../../../common/errors";

export class BattleshipsConductedOnUnavailableError extends AppError {
  constructor() {
    super("Conducted date can be changed only after a Battleships game is finished", {
      code: "battleships_conducted_on_requires_finished_game",
      statusCode: 409,
    });
  }
}
