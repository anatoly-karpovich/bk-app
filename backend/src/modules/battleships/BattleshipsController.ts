import type { Request, Response } from "express";
import { RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { GameConfigNotFoundError } from "../gameConfigs/errors";
import { ProjectNotFoundError } from "../projects/errors";
import {
  BattleshipsGameNotFoundError,
  BattleshipsGamesNotFoundError,
  BattleshipsShotValidationError,
  InvalidBattleshipsGameIdError,
} from "./errors";
import {
  battleshipsGameIdParamsSchema,
  battleshipsShotSchema,
  createBattleshipsGameDjNameSchema,
  createBattleshipsGamePlayerNameSchema,
  createBattleshipsGamePresetSchema,
  createBattleshipsGameProjectParamsSchema,
  latestBattleshipsGameQuerySchema,
} from "./battleships.schemas";
import { BattleshipsService } from "./BattleshipsService";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function getProjectId(req: Request): string {
  return parseRequest(
    createBattleshipsGameProjectParamsSchema,
    req.params,
    "Route parameter 'projectId' must be a valid project id",
  ).projectId;
}

export class BattleshipsController {
  constructor(private readonly battleshipsService: BattleshipsService) {}

  createBattleshipsGameInProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = parseRequest(
        createBattleshipsGameProjectParamsSchema,
        req.params,
        "Route parameter 'projectId' must be a valid project id",
      );
      const { playerName } = parseRequest(
        createBattleshipsGamePlayerNameSchema,
        { playerName: req.body?.playerName },
        "Body field 'playerName' must be a non-empty string",
      );
      const { gameConfigId } = parseRequest(
        createBattleshipsGamePresetSchema,
        { gameConfigId: req.body?.gameConfigId },
        "Body field 'gameConfigId' must be a valid game config id",
      );
      const { djName } = parseRequest(
        createBattleshipsGameDjNameSchema,
        { djName: req.body?.djName },
        "Body field 'djName' must be a string when provided",
      );
      const game = await this.battleshipsService.createBattleshipsGameSnapshotInProject(projectId, {
        playerName,
        gameConfigId,
        djName,
      });

      return res.status(201).json({
        success: true,
        data: game,
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (
        error instanceof ProjectNotFoundError ||
        error instanceof GameConfigNotFoundError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: "Failed to create battleships game",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create battleships game",
        error: getErrorMessage(error),
      });
    }
  };

  listBattleshipsGames = async (_req: Request, res: Response) => {
    try {
      const games = await this.battleshipsService.listBattleshipsGameSnapshots(getProjectId(_req));

      return res.status(200).json({
        success: true,
        data: games,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to load battleships games",
        error: getErrorMessage(error),
      });
    }
  };

  getBattleshipsGameById = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        battleshipsGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      const game = await this.battleshipsService.getBattleshipsGameSnapshot(getProjectId(req), gameId);

      return res.status(200).json({
        success: true,
        data: game,
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Route parameter 'gameId' is required",
        });
      }

      if (error instanceof BattleshipsGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Battleships game not found",
        });
      }

      if (error instanceof InvalidBattleshipsGameIdError) {
        return res.status(400).json({
          success: false,
          message: "Failed to load battleships game",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to load battleships game",
        error: getErrorMessage(error),
      });
    }
  };

  getLatestBattleshipsGame = async (req: Request, res: Response) => {
    try {
      const { status } = parseRequest(
        latestBattleshipsGameQuerySchema,
        req.query,
        "Query parameter 'status' must be either 'in_progress' or 'finished'",
      );
      const game = await this.battleshipsService.getLatestBattleshipsGameSnapshot(getProjectId(req), status);

      return res.status(200).json({
        success: true,
        data: game,
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Query parameter 'status' must be either 'in_progress' or 'finished'",
        });
      }

      if (error instanceof BattleshipsGamesNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "No battleships games found",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to load latest battleships game",
        error: getErrorMessage(error),
      });
    }
  };

  makeBattleshipsShot = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        battleshipsGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      const shot = parseRequest(
        battleshipsShotSchema,
        req.body,
        "Body fields 'row' and 'column' must be positive integers",
      );
      const updatedGame = await this.battleshipsService.submitBattleshipsShot(getProjectId(req), gameId, shot);

      return res.status(200).json({
        success: true,
        data: updatedGame,
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (error instanceof BattleshipsGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Battleships game not found",
        });
      }

      if (
        error instanceof InvalidBattleshipsGameIdError ||
        error instanceof BattleshipsShotValidationError
      ) {
        return res.status(400).json({
          success: false,
          message: "Failed to apply battleships shot",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to apply battleships shot",
        error: getErrorMessage(error),
      });
    }
  };

  undoBattleshipsShot = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        battleshipsGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      const updatedGame = await this.battleshipsService.undoBattleshipsShot(getProjectId(req), gameId);

      return res.status(200).json({
        success: true,
        data: updatedGame,
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Route parameter 'gameId' is required",
        });
      }

      if (error instanceof BattleshipsGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Battleships game not found",
        });
      }

      if (
        error instanceof InvalidBattleshipsGameIdError ||
        error instanceof BattleshipsShotValidationError
      ) {
        return res.status(400).json({
          success: false,
          message: "Failed to undo battleships shot",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to undo battleships shot",
        error: getErrorMessage(error),
      });
    }
  };

  deleteBattleshipsGame = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        battleshipsGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      await this.battleshipsService.deleteBattleshipsGameSnapshot(getProjectId(req), gameId);

      return res.status(200).json({
        success: true,
        message: "Battleships game deleted",
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Route parameter 'gameId' is required",
        });
      }

      if (error instanceof BattleshipsGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Battleships game not found",
        });
      }

      if (error instanceof InvalidBattleshipsGameIdError) {
        return res.status(400).json({
          success: false,
          message: "Failed to delete battleships game",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to delete battleships game",
        error: getErrorMessage(error),
      });
    }
  };
}
