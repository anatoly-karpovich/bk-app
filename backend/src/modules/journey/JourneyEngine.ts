import {
  calculateReceiptsDistribution as calculateReceiptsDistributionFn,
  createJourneyGame as createJourneyGameFn,
  getJourneyActivePlayers as getJourneyActivePlayersFn,
  getJourneyFinishedPlayers as getJourneyFinishedPlayersFn,
  getJourneyPlayerFullPrize as getJourneyPlayerFullPrizeFn,
  getJourneyPlayerTimelines as getJourneyPlayerTimelinesFn,
  getJourneyResults as getJourneyResultsFn,
  getJourneyVisiblePlayers as getJourneyVisiblePlayersFn,
  isJourneyGameOver as isJourneyGameOverFn,
  makeJourneyRound as makeJourneyRoundFn,
  normalizeJourneyGame as normalizeJourneyGameFn,
  removeJourneyPlayer as removeJourneyPlayerFn,
} from "./domain/engine";
import type {
  JourneyGame,
  JourneyMoveInput,
  JourneyPlayer,
  JourneyRules,
  JourneyTimelineEntry,
  RandomFn,
} from "./domain/types";
import { JourneyRoundValidationError } from "./errors";

export class JourneyEngine {
  normalizeGame(game: JourneyGame | null): JourneyGame | null {
    return normalizeJourneyGameFn(game);
  }

  createGame(
    nicknames: string[],
    options: {
      randomFn?: RandomFn;
      rules?: JourneyRules;
      djName?: string;
      configId?: string;
      configName?: string;
    } = {},
  ): JourneyGame {
    return createJourneyGameFn(nicknames, options);
  }

  makeRound(
    game: JourneyGame,
    inputMoves: JourneyMoveInput[],
    skippedPlayerIds: string[] = [],
    randomFn?: RandomFn,
  ): JourneyGame {
    try {
      return makeJourneyRoundFn(game, inputMoves, skippedPlayerIds, randomFn);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Journey round validation failed:")
      ) {
        throw new JourneyRoundValidationError(error.message);
      }

      throw error;
    }
  }

  removePlayer(game: JourneyGame, playerId: string): JourneyGame {
    return removeJourneyPlayerFn(game, playerId);
  }

  isGameOver(game: JourneyGame): boolean {
    return isJourneyGameOverFn(game);
  }

  getActivePlayers(game: JourneyGame): JourneyPlayer[] {
    return getJourneyActivePlayersFn(game);
  }

  getFinishedPlayers(game: JourneyGame): JourneyPlayer[] {
    return getJourneyFinishedPlayersFn(game);
  }

  getVisiblePlayers(game: JourneyGame): JourneyPlayer[] {
    return getJourneyVisiblePlayersFn(game);
  }

  getPlayerFullPrize(player: JourneyPlayer): number {
    return getJourneyPlayerFullPrizeFn(player);
  }

  getResults(game: JourneyGame): Array<JourneyPlayer & { fullPrize: number }> {
    return getJourneyResultsFn(game);
  }

  calculateReceiptsDistribution(game: JourneyGame): Record<number, number> {
    return calculateReceiptsDistributionFn(game);
  }

  getPlayerTimelines(game: JourneyGame): Record<string, JourneyTimelineEntry[]> {
    return getJourneyPlayerTimelinesFn(game);
  }
}
