import { NotFoundError } from "../../common/errors";

export class ConfigNotFoundError extends NotFoundError {
  constructor(configId: string) {
    super("Config not found", {
      code: "config_not_found",
      details: { configId },
    });
  }
}
