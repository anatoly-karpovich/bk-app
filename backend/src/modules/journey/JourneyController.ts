import type { Request, Response } from "express";
import { AppError, RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { GameConfigNotFoundError } from "../gameConfigs/errors";
import { ProjectNotFoundError } from "../projects/errors";
import type { JourneyMoveInput } from "./domain/types";
import {
  InvalidJourneyGameIdError,
  JourneyGameNotFoundError,
  JourneyGamesNotFoundError,
  JourneyRoundValidationError,
} from "./errors";
import {
  createJourneyGameDjNameSchema,
  createJourneyGameForumTopicSchema,
  importJourneyPlayersFromForumSchema,
  createJourneyGameNicknamesSchema,
  createJourneyGamePresetSchema,
  createJourneyGameProjectParamsSchema,
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

function getProjectId(req: Request): string {
  return parseRequest(
    createJourneyGameProjectParamsSchema,
    req.params,
    "Route parameter 'projectId' must be a valid project id",
  ).projectId;
}

export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  createJourneyGameInProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = parseRequest(
        createJourneyGameProjectParamsSchema,
        req.params,
        "Route parameter 'projectId' must be a valid project id",
      );
      const { nicknames } = parseRequest(
        createJourneyGameNicknamesSchema,
        { nicknames: req.body?.nicknames },
        "Body field 'nicknames' must be a non-empty string array",
      );
      const { gameConfigId } = parseRequest(
        createJourneyGamePresetSchema,
        { gameConfigId: req.body?.gameConfigId },
        "Body field 'gameConfigId' must be a valid game config id",
      );
      const { djName } = parseRequest(
        createJourneyGameDjNameSchema,
        { djName: req.body?.djName },
        "Body field 'djName' must be a string when provided",
      );
      const { forumTopicId } = parseRequest(
        createJourneyGameForumTopicSchema,
        { forumTopicId: req.body?.forumTopicId },
        "Body field 'forumTopicId' must be a positive integer when provided",
      );
      if (forumTopicId && !djName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Body field 'djName' is required when 'forumTopicId' is provided",
        });
      }
      const game = await this.journeyService.createJourneyGameSnapshotInProject(projectId, {
        nicknames,
        gameConfigId,
        djName,
        forumTopicId,
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
      const games = await this.journeyService.listJourneyGameSnapshots(getProjectId(_req));

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
      const game = await this.journeyService.getJourneyGameSnapshot(getProjectId(req), gameId);

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

  getJourneyForumState = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        journeyGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      const forumState = await this.journeyService.getJourneyForumState(getProjectId(req), gameId);

      return res.status(200).json({
        success: true,
        data: forumState,
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
          message: "Failed to load Journey forum state",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to load Journey forum state",
        error: getErrorMessage(error),
      });
    }
  };

  previewJourneyForumMoves = async (req: Request, res: Response) => {
    try {
      const { gameId } = parseRequest(
        journeyGameIdParamsSchema,
        req.params,
        "Route parameter 'gameId' is required",
      );
      const preview = await this.journeyService.previewJourneyForumMoves(getProjectId(req), gameId);

      return res.status(200).json({ success: true, data: preview });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({ success: false, message: error.message });
      }

      if (error instanceof JourneyGameNotFoundError) {
        return res.status(404).json({ success: false, message: "Journey game not found" });
      }

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: "Failed to import Journey moves from forum",
          error: error.message,
          code: error.code,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to import Journey moves from forum",
        error: getErrorMessage(error),
      });
    }
  };

  importJourneyPlayersFromForum = async (req: Request, res: Response) => {
    try {
      const { forumTopicId, djName } = parseRequest(
        importJourneyPlayersFromForumSchema,
        req.body,
        "Body fields 'forumTopicId' and 'djName' are required",
      );
      const players = await this.journeyService.importJourneyPlayersFromForum(
        getProjectId(req),
        forumTopicId,
        djName,
      );

      return res.status(200).json({ success: true, data: players });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({ success: false, message: error.message });
      }

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: "Failed to import Journey players from forum",
          error: error.message,
          code: error.code,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to import Journey players from forum",
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
      const game = await this.journeyService.getLatestJourneyGameSnapshot(getProjectId(req), status);

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
      const updatedGame = await this.journeyService.submitJourneyRound(getProjectId(req), gameId, {
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
      const updatedGame = await this.journeyService.removeJourneyPlayerFromSnapshot(getProjectId(req), gameId, playerId);

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
      await this.journeyService.deleteJourneyGameSnapshot(getProjectId(req), gameId);

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
