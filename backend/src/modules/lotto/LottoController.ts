import type { Request, Response } from "express";
import { RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import {
  InvalidLottoGameIdError,
  LottoConfigNotFoundError,
  LottoConfigUnsupportedError,
  LottoGameNotFoundError,
  LottoGamesNotFoundError,
  LottoValidationError,
} from "./errors";
import {
  createLottoGameConfigSchema,
  createLottoGameDjNameSchema,
  createLottoGamePlayersSchema,
  latestLottoGameQuerySchema,
  lottoGameIdParamsSchema,
  lottoPlayerIdParamsSchema,
} from "./lotto.schemas";
import { LottoService } from "./LottoService";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export class LottoController {
  constructor(private readonly lottoService: LottoService) {}

  createLottoGame = async (req: Request, res: Response) => {
    try {
      const { players } = parseRequest(
        createLottoGamePlayersSchema,
        { players: req.body?.players },
        "Body field 'players' must contain at least one player",
      );
      const { configId } = parseRequest(
        createLottoGameConfigSchema,
        { configId: req.body?.configId },
        "Body field 'configId' must be a valid config id",
      );
      const { djName } = parseRequest(
        createLottoGameDjNameSchema,
        { djName: req.body?.djName },
        "Body field 'djName' must be a string when provided",
      );
      const game = await this.lottoService.createLottoGameSnapshot({
        players,
        configId,
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

      if (error instanceof LottoConfigNotFoundError || error instanceof LottoConfigUnsupportedError) {
        return res.status(error.statusCode).json({
          success: false,
          message: "Failed to create lotto game",
          error: error.message,
        });
      }

      if (error instanceof LottoValidationError) {
        return res.status(400).json({
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
      const games = await this.lottoService.listLottoGameSnapshots();

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
      const game = await this.lottoService.getLottoGameSnapshot(gameId);

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
      const game = await this.lottoService.getLatestLottoGameSnapshot(status);

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
      const updatedGame = await this.lottoService.drawNextLottoNumber(gameId);

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
      const updatedGame = await this.lottoService.removeLottoPlayerFromSnapshot(gameId, playerId);

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
      await this.lottoService.deleteLottoGameSnapshot(gameId);

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
