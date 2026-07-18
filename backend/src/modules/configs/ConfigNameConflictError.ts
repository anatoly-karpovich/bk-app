import { ConflictError } from "../../common/errors";

export class ConfigNameConflictError extends ConflictError {
  constructor(configName: string) {
    super("Config name already exists", {
      code: "config_name_conflict",
      details: { configName },
    });
  }
}
