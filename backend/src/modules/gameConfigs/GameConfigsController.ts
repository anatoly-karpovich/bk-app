import type { Request, Response } from "express";
import { AppError, RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { ProjectNotFoundError } from "../projects/errors";
import { GameConfigsService } from "./GameConfigsService";
import { GameConfigCurrencyValidationError, GameConfigNameConflictError, GameConfigNotFoundError } from "./errors";
import {
  cloneGameConfigSchema,
  gameConfigIdParamsSchema,
  gameConfigsListQuerySchema,
  projectGameConfigsParamsSchema,
  updateGameConfigSchema,
} from "./gameConfigs.schemas";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export class GameConfigsController {
  constructor(private readonly gameConfigsService: GameConfigsService) {}

  listProjectGameConfigs = async (req: Request, res: Response) => {
    try {
      const { projectId } = parseRequest(
        projectGameConfigsParamsSchema,
        req.params,
        "Route parameter 'projectId' must be a valid project id",
      );
      const { gameType } = parseRequest(
        gameConfigsListQuerySchema,
        req.query,
        "Query parameter 'gameType' must be one of: journey, battleships, lotto",
      );
      const configs = await this.gameConfigsService.listProjectGameConfigs(req.authUser!, projectId, gameType);

      return res.status(200).json({
        success: true,
        data: configs,
      });
    } catch (error) {
      if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (error instanceof ProjectNotFoundError || error instanceof GameConfigNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Project or game configs not found",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to load game configs",
        error: getErrorMessage(error),
      });
    }
  };

  getProjectGameConfig = async (req: Request, res: Response) => {
    try {
      const { projectId, gameConfigId } = parseRequest(gameConfigIdParamsSchema, req.params, "Invalid route parameters");
      const config = await this.gameConfigsService.getProjectGameConfig(req.authUser!, projectId, gameConfigId);
      return res.status(200).json({ success: true, data: config });
    } catch (error) {
      return this.handleMutationError(error, res, "Failed to load game config");
    }
  };

  createProjectGameConfig = async (req: Request, res: Response) => {
    try {
      const { projectId } = parseRequest(projectGameConfigsParamsSchema, req.params, "Invalid project id");
      const input = parseRequest(cloneGameConfigSchema, req.body, "Invalid game config input");
      const config = await this.gameConfigsService.cloneProjectGameConfig(req.authUser!, projectId, input);
      return res.status(201).json({ success: true, data: config });
    } catch (error) {
      return this.handleMutationError(error, res, "Failed to create game config");
    }
  };

  updateProjectGameConfig = async (req: Request, res: Response) => {
    try {
      const { projectId, gameConfigId } = parseRequest(gameConfigIdParamsSchema, req.params, "Invalid route parameters");
      const input = parseRequest(updateGameConfigSchema, req.body, "Invalid game config input");
      const config = await this.gameConfigsService.updateProjectGameConfig(req.authUser!, projectId, gameConfigId, input);
      return res.status(200).json({ success: true, data: config });
    } catch (error) {
      return this.handleMutationError(error, res, "Failed to update game config");
    }
  };

  deleteProjectGameConfig = async (req: Request, res: Response) => {
    try {
      const { projectId, gameConfigId } = parseRequest(gameConfigIdParamsSchema, req.params, "Invalid route parameters");
      await this.gameConfigsService.deleteProjectGameConfig(req.authUser!, projectId, gameConfigId);
      return res.status(200).json({ success: true });
    } catch (error) {
      return this.handleMutationError(error, res, "Failed to delete game config");
    }
  };

  private handleMutationError(error: unknown, res: Response, message: string) {
    if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
    if (error instanceof RequestValidationError || error instanceof GameConfigCurrencyValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (error instanceof ProjectNotFoundError || error instanceof GameConfigNotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (error instanceof GameConfigNameConflictError) {
      return res.status(409).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message, error: getErrorMessage(error) });
  }
}
