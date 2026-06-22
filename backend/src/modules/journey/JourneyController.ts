import type { Request, Response } from "express";
import { RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import type { JourneyMoveInput } from "./domain/types";
import {
  InvalidJourneyGameIdError,
  JourneyConfigNotFoundError,
  JourneyConfigUnsupportedError,
  JourneyGameNotFoundError,
  JourneyGamesNotFoundError,
  JourneyRoundValidationError,
} from "./errors";
import {
  createJourneyGameConfigSchema,
  createJourneyGameNicknamesSchema,
  journeyGameIdParamsSchema,
  journeyParseMovesTextSchema,
  journeyParsePlayersSchema,
  journeyPlayerParamsSchema,
  journeyRoundMovesSchema,
  journeyRoundSkippedPlayerIdsSchema,
  latestJourneyGameQuerySchema,
} from "./journey.schemas";
import { JourneyService } from "./JourneyService";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  createJourneyGame = async (req: Request, res: Response) => {
    try {
      const { nicknames } = parseRequest(
        createJourneyGameNicknamesSchema,
        { nicknames: req.body?.nicknames },
        "Body field 'nicknames' must be a non-empty string array",
      );
      const { configId } = parseRequest(
        createJourneyGameConfigSchema,
        { configId: req.body?.configId },
        "Body field 'configId' must be a non-empty string",
      );
      const game = await this.journeyService.createJourneyGameSnapshot({
        nicknames,
        configId,
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
        error instanceof JourneyConfigNotFoundError ||
        error instanceof JourneyConfigUnsupportedError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: "Failed to create journey game",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create journey game",
        error: getErrorMessage(error),
      });
    }
  };

  listJourneyGames = async (_req: Request, res: Response) => {
    try {
      const games = await this.journeyService.listJourneyGameSnapshots();

      return res.status(200).json({
        success: true,
        data: games,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to load journey games",
        error: getErrorMessage(error),
      });
    }
  };

  getJourneyGameById = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        journeyGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      const game = await this.journeyService.getJourneyGameSnapshot(gameId);

      if (!game) {
        return res.status(404).json({
          success: false,
          message: "Journey game not found",
        });
      }

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

      if (error instanceof JourneyGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Journey game not found",
        });
      }

      if (error instanceof InvalidJourneyGameIdError) {
        return res.status(400).json({
          success: false,
          message: "Failed to load journey game",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to load journey game",
        error: getErrorMessage(error),
      });
    }
  };

  getLatestJourneyGame = async (req: Request, res: Response) => {
    try {
      const { status } = parseRequest(
        latestJourneyGameQuerySchema,
        req.query,
        "Query parameter 'status' must be either 'in_progress' or 'finished'",
      );
      const game = await this.journeyService.getLatestJourneyGameSnapshot(status);

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

      if (error instanceof JourneyGamesNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "No journey games found",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to load latest journey game",
        error: getErrorMessage(error),
      });
    }
  };

  makeJourneyRoundMove = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        journeyGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      const { moves } = parseRequest(
        journeyRoundMovesSchema,
        { moves: req.body?.moves },
        "Body field 'moves' must be an array of { playerId, dice }",
      );
      const { skippedPlayerIds } = parseRequest(
        journeyRoundSkippedPlayerIdsSchema,
        { skippedPlayerIds: req.body?.skippedPlayerIds },
        "Body field 'skippedPlayerIds' must be a string array when provided",
      );
      const updatedGame = await this.journeyService.submitJourneyRound(gameId, {
        moves: moves as JourneyMoveInput[],
        skippedPlayerIds,
      });

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

      if (error instanceof JourneyGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Journey game not found",
        });
      }

      if (
        error instanceof InvalidJourneyGameIdError ||
        error instanceof JourneyRoundValidationError
      ) {
        return res.status(400).json({
          success: false,
          message: "Failed to apply journey round",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to apply journey round",
        error: getErrorMessage(error),
      });
    }
  };

  removeJourneyPlayerFromGame = async (req: Request, res: Response) => {
    try {
      const { gameId, playerId } = parseRequest(
        journeyPlayerParamsSchema,
        req.params,
        "Route parameters 'gameId' and 'playerId' are required",
      );
      const updatedGame = await this.journeyService.removeJourneyPlayerFromSnapshot(gameId, playerId);

      return res.status(200).json({
        success: true,
        data: updatedGame,
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Route parameters 'gameId' and 'playerId' are required",
        });
      }

      if (error instanceof JourneyGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Journey game not found",
        });
      }

      if (error instanceof InvalidJourneyGameIdError) {
        return res.status(400).json({
          success: false,
          message: "Failed to remove journey player",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to remove journey player",
        error: getErrorMessage(error),
      });
    }
  };

  deleteJourneyGame = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        journeyGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      await this.journeyService.deleteJourneyGameSnapshot(gameId);

      return res.status(200).json({
        success: true,
        message: "Journey game deleted",
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Route parameter 'gameId' is required",
        });
      }

      if (error instanceof JourneyGameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Journey game not found",
        });
      }

      if (error instanceof InvalidJourneyGameIdError) {
        return res.status(400).json({
          success: false,
          message: "Failed to delete journey game",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to delete journey game",
        error: getErrorMessage(error),
      });
    }
  };

  parseJourneyPlayersFromForum = (req: Request, res: Response) => {
    try {
      const { text, djName } = parseRequest(
        journeyParsePlayersSchema,
        req.body,
        "Body field 'text' must be a string",
      );

      return res.status(200).json({
        success: true,
        data: this.journeyService.parseJourneyPlayers(text, djName ?? ""),
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Body field 'text' must be a string",
        });
      }

      throw error;
    }
  };

  parseJourneyMovesFromForum = (req: Request, res: Response) => {
    try {
      const { text } = parseRequest(
        journeyParseMovesTextSchema,
        { text: req.body?.text },
        "Body field 'text' must be a string",
      );

      return res.status(200).json({
        success: true,
        data: this.journeyService.parseJourneyMoves(text),
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Body field 'text' must be a string",
        });
      }

      throw error;
    }
  };
}
