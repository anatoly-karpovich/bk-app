import type { Request, Response } from "express";
import { RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { ConfigNotFoundError } from "./errors";
import { configIdParamsSchema } from "./configs.schemas";
import { ConfigsService } from "./ConfigsService";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export class ConfigsController {
  constructor(private readonly configsService: ConfigsService) {}

  getConfigs = async (_req: Request, res: Response) => {
    try {
      const configs = await this.configsService.listConfigs();

      return res.status(200).json({
        success: true,
        data: configs,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to load configs",
        error: getErrorMessage(error),
      });
    }
  };

  getConfig = async (req: Request, res: Response) => {
    try {
      const { configId } = parseRequest(
        configIdParamsSchema,
        req.params,
        "Route parameter 'configId' is required",
      );
      const config = await this.configsService.getConfigByIdOrThrow(configId);

      return res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Route parameter 'configId' is required",
        });
      }

      if (error instanceof ConfigNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Config not found",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to load config",
        error: getErrorMessage(error),
      });
    }
  };
}
