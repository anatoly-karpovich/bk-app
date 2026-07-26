import type { Request, Response } from "express";
import { RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { GameConfigNotFoundError } from "../gameConfigs/errors";
import { ProjectNotFoundError } from "../projects/errors";
import {
  InvalidLottoGameIdError,
  LottoGameNotFoundError,
  LottoGamesNotFoundError,
  LottoValidationError,
} from "./errors";
import {
  createLottoGameDjNameSchema,
  createLottoGamePlayersSchema,
  createLottoGamePresetSchema,
  createLottoGameProjectParamsSchema,
  latestLottoGameQuerySchema,
  lottoGameIdParamsSchema,
  lottoPlayerIdParamsSchema,
} from "./lotto.schemas";
import { LottoService } from "./LottoService";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function getProjectId(req: Request): string {
  return parseRequest(
    createLottoGameProjectParamsSchema,
    req.params,
    "Route parameter 'projectId' must be a valid project id",
  ).projectId;
}

export class LottoController {
  constructor(private readonly lottoService: LottoService) {}

  createLottoGameInProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = parseRequest(
        createLottoGameProjectParamsSchema,
        req.params,
        "Route parameter 'projectId' must be a valid project id",
      );
      const { players } = parseRequest(
        createLottoGamePlayersSchema,
        { players: req.body?.players },
        "Body field 'players' must be a non-empty array of lotto players",
      );
      const { gameConfigId } = parseRequest(
        createLottoGamePresetSchema,
        { gameConfigId: req.body?.gameConfigId },
        "Body field 'gameConfigId' must be a valid game config id",
      );
      const { djName } = parseRequest(
        createLottoGameDjNameSchema,
        { djName: req.body?.djName },
        "Body field 'djName' must be a string when provided",
      );
      const game = await this.lottoService.createLottoGameSnapshotInProject(projectId, {
        players,
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
          message: "Failed to create lotto game",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create lotto game",
        error: getErrorMessage(error),
      });
    }
  };

  listLottoGames = async (_req: Request, res: Response) => {
    try {
      const games = await this.lottoService.listLottoGameSnapshots(getProjectId(_req));

      return res.status(200).json({
        success: true,
        data: games,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to load lotto games",
        error: getErrorMessage(error),
      });
    }
  };

  getLottoGameById = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        lottoGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      const game = await this.lottoService.getLottoGameSnapshot(getProjectId(req), gameId);

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

      if (error instanceof LottoGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Lotto game not found",
        });
      }

      if (error instanceof InvalidLottoGameIdError) {
        return res.status(400).json({
          success: false,
          message: "Failed to load lotto game",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to load lotto game",
        error: getErrorMessage(error),
      });
    }
  };

  getLatestLottoGame = async (req: Request, res: Response) => {
    try {
      const { status } = parseRequest(
        latestLottoGameQuerySchema,
        req.query,
        "Query parameter 'status' must be either 'in_progress' or 'finished'",
      );
      const game = await this.lottoService.getLatestLottoGameSnapshot(getProjectId(req), status);

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

      if (error instanceof LottoGamesNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "No lotto games found",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to load latest lotto game",
        error: getErrorMessage(error),
      });
    }
  };

  drawNextNumber = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        lottoGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      const updatedGame = await this.lottoService.drawNextLottoNumber(getProjectId(req), gameId);

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

      if (error instanceof LottoGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Lotto game not found",
        });
      }

      if (error instanceof InvalidLottoGameIdError || error instanceof LottoValidationError) {
        return res.status(400).json({
          success: false,
          message: "Failed to draw lotto number",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to draw lotto number",
        error: getErrorMessage(error),
      });
    }
  };

  removePlayerFromGame = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        lottoGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      const { playerId } = parseRequest(
        lottoPlayerIdParamsSchema,
        req.params,
        "Route parameter 'playerId' is required",
      );
      const updatedGame = await this.lottoService.removeLottoPlayerFromSnapshot(getProjectId(req), gameId, playerId);

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

      if (error instanceof LottoGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Lotto game not found",
        });
      }

      if (error instanceof InvalidLottoGameIdError || error instanceof LottoValidationError) {
        return res.status(400).json({
          success: false,
          message: "Failed to remove lotto player",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to remove lotto player",
        error: getErrorMessage(error),
      });
    }
  };

  deleteLottoGame = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        lottoGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      await this.lottoService.deleteLottoGameSnapshot(getProjectId(req), gameId);

      return res.status(200).json({
        success: true,
        message: "Lotto game deleted",
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Route parameter 'gameId' is required",
        });
      }

      if (error instanceof LottoGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Lotto game not found",
        });
      }

      if (error instanceof InvalidLottoGameIdError) {
        return res.status(400).json({
          success: false,
          message: "Failed to delete lotto game",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to delete lotto game",
        error: getErrorMessage(error),
      });
    }
  };
}
