import type { Request, Response } from "express";
import { RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { ConfigNameConflictError, ConfigNotFoundError } from "./errors";
import { appConfigMutationSchema, configIdParamsSchema } from "./configs.schemas";
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
        "Route parameter 'configId' must be a valid config id",
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
          message: "Route parameter 'configId' must be a valid config id",
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

  createConfig = async (req: Request, res: Response) => {
    try {
      const payload = parseRequest(
        appConfigMutationSchema,
        req.body,
        "Config payload is invalid",
      );
      const config = await this.configsService.createConfig(payload);

      return res.status(201).json({
        success: true,
        data: config,
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Config payload is invalid",
          error: error.message,
        });
      }

      if (error instanceof ConfigNameConflictError) {
        return res.status(409).json({
          success: false,
          message: "Config name already exists",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create config",
        error: getErrorMessage(error),
      });
    }
  };

  updateConfig = async (req: Request, res: Response) => {
    try {
      const { configId } = parseRequest(
        configIdParamsSchema,
        req.params,
        "Route parameter 'configId' must be a valid config id",
      );
      const payload = parseRequest(
        appConfigMutationSchema,
        req.body,
        "Config payload is invalid",
      );
      const config = await this.configsService.updateConfig(configId, payload);

      return res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Failed to update config",
          error: error.message,
        });
      }

      if (error instanceof ConfigNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Config not found",
        });
      }

      if (error instanceof ConfigNameConflictError) {
        return res.status(409).json({
          success: false,
          message: "Config name already exists",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to update config",
        error: getErrorMessage(error),
      });
    }
  };

  deleteConfig = async (req: Request, res: Response) => {
    try {
      const { configId } = parseRequest(
        configIdParamsSchema,
        req.params,
        "Route parameter 'configId' must be a valid config id",
      );
      await this.configsService.deleteConfig(configId);

      return res.status(200).json({
        success: true,
        message: "Config deleted",
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Route parameter 'configId' must be a valid config id",
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
        message: "Failed to delete config",
        error: getErrorMessage(error),
      });
    }
  };
}
