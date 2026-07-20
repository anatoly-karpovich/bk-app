import type { CurrencySnapshot as ConfigCurrency } from "../../common/currency";
import {
  createJourneyGame as createJourneyGameFn,
  getJourneyActivePlayers as getJourneyActivePlayersFn,
  getJourneyFinishedPlayers as getJourneyFinishedPlayersFn,
  getJourneyPlayerTimelines as getJourneyPlayerTimelinesFn,
  getJourneyResults as getJourneyResultsFn,
  getJourneyVisiblePlayers as getJourneyVisiblePlayersFn,
  isJourneyGameOver as isJourneyGameOverFn,
  makeJourneyRound as makeJourneyRoundFn,
  normalizeJourneyGame as normalizeJourneyGameFn,
  removeJourneyPlayer as removeJourneyPlayerFn,
} from "./domain/engine";
import { getJourneyAchievementProgress as getJourneyAchievementProgressFn } from "./domain/achievementProgress";
import type {
  JourneyAchievementProgress,
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
      currencies?: ConfigCurrency[];
      djName?: string;
      projectId?: string;
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

  getResults(game: JourneyGame): JourneyPlayer[] {
    return getJourneyResultsFn(game);
  }

  getPlayerTimelines(game: JourneyGame): Record<string, JourneyTimelineEntry[]> {
    return getJourneyPlayerTimelinesFn(game);
  }

  getAchievementProgress(player: JourneyPlayer, rules: JourneyRules): JourneyAchievementProgress {
    return getJourneyAchievementProgressFn(player, rules);
  }
}
