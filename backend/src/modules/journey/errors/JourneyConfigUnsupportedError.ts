import { AppError } from "../../../common/errors";

export class JourneyConfigUnsupportedError extends AppError {
  constructor(configId: string, configName: string) {
    super(`Config '${configName}' does not support Journey`, {
      code: "journey_config_unsupported",
      details: { configId, configName },
      statusCode: 400,
    });
  }
}
