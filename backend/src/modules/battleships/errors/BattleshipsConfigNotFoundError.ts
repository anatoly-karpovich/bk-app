import { NotFoundError } from "../../../common/errors";

export class BattleshipsConfigNotFoundError extends NotFoundError {
  constructor(configId: string) {
    super("Battleships config not found", {
      code: "battleships_config_not_found",
      details: { configId },
    });
  }
}
