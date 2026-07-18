import { NotFoundError } from "../../../common/errors";

export class JourneyConfigNotFoundError extends NotFoundError {
  constructor(configId: string) {
    super("Journey config not found", {
      code: "journey_config_not_found",
      details: { configId },
    });
  }
}
