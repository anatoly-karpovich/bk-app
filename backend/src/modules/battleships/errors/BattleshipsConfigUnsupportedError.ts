import { AppError } from "../../../common/errors";

export class BattleshipsConfigUnsupportedError extends AppError {
  constructor(configId: string, configName: string) {
    super(`Config '${configName}' does not support Battleships`, {
      code: "battleships_config_unsupported",
      details: { configId, configName },
      statusCode: 400,
    });
  }
}
