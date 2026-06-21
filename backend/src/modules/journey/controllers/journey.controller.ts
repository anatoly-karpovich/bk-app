import type { Request, Response } from "express";
import {
  createJourneyGameSnapshot,
  deleteJourneyGameSnapshot,
  getJourneyGameSnapshot,
  getLatestJourneyGameSnapshot,
  parseJourneyMoves,
  parseJourneyPlayers,
  removeJourneyPlayerFromSnapshot,
  replaceJourneyGameSnapshot,
  submitJourneyRound,
} from "../services/journey.service";
import type { JourneyGame, JourneyMoveInput, JourneyRules } from "../domain/types";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isJourneyMoveInputArray(value: unknown): value is JourneyMoveInput[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as JourneyMoveInput).playerId === "string" &&
        typeof (item as JourneyMoveInput).dice === "number",
    )
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function getSingleRouteParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export async function createJourneyGame(req: Request, res: Response) {
  const { nicknames, rules, rulesetId, rulesetName } = req.body as {
    nicknames?: unknown;
    rules?: JourneyRules;
    rulesetId?: string;
    rulesetName?: string;
  };

  if (!isStringArray(nicknames) || nicknames.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Body field 'nicknames' must be a non-empty string array",
    });
  }

  try {
    const game = await createJourneyGameSnapshot({
      nicknames,
      rules,
      rulesetId,
      rulesetName,
    });

    return res.status(201).json({
      success: true,
      data: game,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create journey game",
      error: getErrorMessage(error),
    });
  }
}

export async function getJourneyGameById(req: Request, res: Response) {
  const gameId = getSingleRouteParam(req.params.gameId);

  if (!gameId) {
    return res.status(400).json({
      success: false,
      message: "Route parameter 'gameId' is required",
    });
  }

  try {
    const game = await getJourneyGameSnapshot(gameId);

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
    return res.status(400).json({
      success: false,
      message: "Failed to load journey game",
      error: getErrorMessage(error),
    });
  }
}

export async function getLatestJourneyGame(req: Request, res: Response) {
  const status = req.query.status;

  if (status !== undefined && status !== "in_progress" && status !== "finished") {
    return res.status(400).json({
      success: false,
      message: "Query parameter 'status' must be either 'in_progress' or 'finished'",
    });
  }

  try {
    const game = await getLatestJourneyGameSnapshot(status);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "No journey games found",
      });
    }

    return res.status(200).json({
      success: true,
      data: game,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load latest journey game",
      error: getErrorMessage(error),
    });
  }
}

export async function updateJourneyGameSnapshot(req: Request, res: Response) {
  const gameId = getSingleRouteParam(req.params.gameId);
  const game = req.body as JourneyGame | undefined;

  if (!gameId) {
    return res.status(400).json({
      success: false,
      message: "Route parameter 'gameId' is required",
    });
  }

  if (!game || typeof game !== "object") {
    return res.status(400).json({
      success: false,
      message: "Request body must contain a JourneyGame snapshot",
    });
  }

  try {
    const updatedGame = await replaceJourneyGameSnapshot(gameId, game);

    if (!updatedGame) {
      return res.status(404).json({
        success: false,
        message: "Journey game not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedGame,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Invalid game id" ? 400 : 500;

    return res.status(status).json({
      success: false,
      message: "Failed to replace journey snapshot",
      error: message,
    });
  }
}

export async function makeJourneyRoundMove(req: Request, res: Response) {
  const gameId = getSingleRouteParam(req.params.gameId);
  const { moves, skippedPlayerIds } = req.body as {
    moves?: unknown;
    skippedPlayerIds?: unknown;
  };

  if (!gameId) {
    return res.status(400).json({
      success: false,
      message: "Route parameter 'gameId' is required",
    });
  }

  if (!isJourneyMoveInputArray(moves)) {
    return res.status(400).json({
      success: false,
      message: "Body field 'moves' must be an array of { playerId, dice }",
    });
  }

  if (skippedPlayerIds !== undefined && !isStringArray(skippedPlayerIds)) {
    return res.status(400).json({
      success: false,
      message: "Body field 'skippedPlayerIds' must be a string array when provided",
    });
  }

  try {
    const updatedGame = await submitJourneyRound(gameId, {
      moves,
      skippedPlayerIds,
    });

    if (!updatedGame) {
      return res.status(404).json({
        success: false,
        message: "Journey game not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedGame,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Invalid game id" ? 400 : 500;

    return res.status(status).json({
      success: false,
      message: "Failed to apply journey round",
      error: message,
    });
  }
}

export async function removeJourneyPlayerFromGame(req: Request, res: Response) {
  const gameId = getSingleRouteParam(req.params.gameId);
  const playerId = getSingleRouteParam(req.params.playerId);

  if (!gameId || !playerId) {
    return res.status(400).json({
      success: false,
      message: "Route parameters 'gameId' and 'playerId' are required",
    });
  }

  try {
    const updatedGame = await removeJourneyPlayerFromSnapshot(gameId, playerId);

    if (!updatedGame) {
      return res.status(404).json({
        success: false,
        message: "Journey game not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedGame,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Invalid game id" ? 400 : 500;

    return res.status(status).json({
      success: false,
      message: "Failed to remove journey player",
      error: message,
    });
  }
}

export async function deleteJourneyGame(req: Request, res: Response) {
  const gameId = getSingleRouteParam(req.params.gameId);

  if (!gameId) {
    return res.status(400).json({
      success: false,
      message: "Route parameter 'gameId' is required",
    });
  }

  try {
    const deleted = await deleteJourneyGameSnapshot(gameId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Journey game not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Journey game deleted",
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Invalid game id" ? 400 : 500;

    return res.status(status).json({
      success: false,
      message: "Failed to delete journey game",
      error: message,
    });
  }
}

export function parseJourneyPlayersFromForum(req: Request, res: Response) {
  const { text, djName } = req.body as {
    text?: unknown;
    djName?: unknown;
  };

  if (typeof text !== "string") {
    return res.status(400).json({
      success: false,
      message: "Body field 'text' must be a string",
    });
  }

  return res.status(200).json({
    success: true,
    data: parseJourneyPlayers(text, typeof djName === "string" ? djName : ""),
  });
}

export function parseJourneyMovesFromForum(req: Request, res: Response) {
  const { text } = req.body as {
    text?: unknown;
  };

  if (typeof text !== "string") {
    return res.status(400).json({
      success: false,
      message: "Body field 'text' must be a string",
    });
  }

  return res.status(200).json({
    success: true,
    data: parseJourneyMoves(text),
  });
}
