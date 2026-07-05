import { NotFoundError } from "../../../common/errors";

export class LottoConfigNotFoundError extends NotFoundError {
  constructor(configId: string) {
    super("Lotto config not found", {
      code: "lotto_config_not_found",
      details: { configId },
    });
  }
}
