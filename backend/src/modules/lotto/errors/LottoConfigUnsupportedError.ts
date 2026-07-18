import { AppError } from "../../../common/errors";

export class LottoConfigUnsupportedError extends AppError {
  constructor(configId: string, configName: string) {
    super(`Config "${configName}" does not include Lotto rules`, {
      code: "lotto_config_unsupported",
      details: { configId, configName },
      statusCode: 400,
    });
  }
}
