// @ts-nocheck
import {
  getJourneyAchievements,
  JOURNEY_ACHIEVEMENT_STREAK_TARGETS,
  getJourneyConfig,
  MOVE_TYPES,
  normalizeJourneyRules,
} from "./config";
import { hasNegativeJourneyRewards, hasPositiveJourneyRewards } from "./currency";
import type {
  JourneyAchievementProgress,
  JourneyCollectorTarget,
  JourneyPlayer,
  JourneyPlayerMoveHistoryEntry,
  JourneyRules,
} from "./types";

const EMPTY_COLLECTOR_TARGET_ID = "empty";

function getCurrentStreak(
  moves: JourneyPlayerMoveHistoryEntry[],
  predicate: (move: JourneyPlayerMoveHistoryEntry) => boolean,
): number {
  let current = 0;

  [...moves].reverse().some((move) => {
    if (predicate(move)) {
      current += 1;
      return false;
    }

    return true;
  });

  return current;
}

function getBestStreak(
  moves: JourneyPlayerMoveHistoryEntry[],
  predicate: (move: JourneyPlayerMoveHistoryEntry) => boolean,
): number {
  let current = 0;
  let best = 0;

  moves.forEach((move) => {
    if (predicate(move)) {
      current += 1;
      best = Math.max(best, current);
      return;
    }

    current = 0;
  });

  return best;
}

function getCollectorTargetId(move: JourneyPlayerMoveHistoryEntry): string | null {
  if (move.type === MOVE_TYPES.EMPTY || move.type === MOVE_TYPES.EMPTY_JACKPOT) {
    return EMPTY_COLLECTOR_TARGET_ID;
  }

  if (!move.cell || move.cell.isJackpot) {
    return null;
  }

  return move.cell.id;
}

function isCarefulMove(move: JourneyPlayerMoveHistoryEntry, finishPosition: number): boolean {
  if (move.position === finishPosition || move.type === MOVE_TYPES.JACKPOT) {
    return false;
  }

  if (!move.cell) {
    return true;
  }

  return move.cell.isJackpot || move.cell.rewards.length === 0;
}

export function getJourneyCollectorTargets(rules: JourneyRules): JourneyCollectorTarget[] {
  const normalizedRules = normalizeJourneyRules(rules);

  return [
    ...normalizedRules.cells.map((cell) => ({
      id: cell.id,
      kind: cell.kind,
      rewards: structuredClone(cell.rewards),
    })),
    { id: EMPTY_COLLECTOR_TARGET_ID, kind: "empty", rewards: [] },
  ];
}

export function getJourneyAchievementProgress(
  player: Pick<JourneyPlayer, "bonuses" | "movesHistory">,
  rules: JourneyRules,
): JourneyAchievementProgress {
  const achievements = getJourneyAchievements(rules);
  const { finishPosition } = getJourneyConfig(rules);
  const collectorTargets = getJourneyCollectorTargets(rules);
  const visitedTargetIds = new Set(
    player.movesHistory.map(getCollectorTargetId).filter((targetId): targetId is string => Boolean(targetId)),
  );
  const obtainedCellIds = collectorTargets
    .map((target) => target.id)
    .filter((targetId) => visitedTargetIds.has(targetId));

  return {
    collector: {
      achieved: player.bonuses.some((bonus) => bonus.name === achievements.COLLECTOR.name),
      obtainedCellIds,
      missingCellIds: collectorTargets.map((target) => target.id).filter((targetId) => !visitedTargetIds.has(targetId)),
    },
    unlucky: {
      achieved: player.bonuses.some((bonus) => bonus.name === achievements.UNLUCKY.name),
      current: getCurrentStreak(player.movesHistory, (move) =>
        Boolean(move.cell && hasNegativeJourneyRewards(move.cell.rewards)),
      ),
      best: getBestStreak(player.movesHistory, (move) =>
        Boolean(move.cell && hasNegativeJourneyRewards(move.cell.rewards)),
      ),
      target: JOURNEY_ACHIEVEMENT_STREAK_TARGETS.unlucky,
    },
    careful: {
      achieved: player.bonuses.some((bonus) => bonus.name === achievements.CAREFUL.name),
      current: getCurrentStreak(player.movesHistory, (move) => isCarefulMove(move, finishPosition)),
      best: getBestStreak(player.movesHistory, (move) => isCarefulMove(move, finishPosition)),
      target: JOURNEY_ACHIEVEMENT_STREAK_TARGETS.careful,
    },
    lucky: {
      achieved: player.bonuses.some((bonus) => bonus.name === achievements.LUCKY.name),
      current: getCurrentStreak(player.movesHistory, (move) =>
        Boolean(move.cell && hasPositiveJourneyRewards(move.cell.rewards)),
      ),
      best: getBestStreak(player.movesHistory, (move) =>
        Boolean(move.cell && hasPositiveJourneyRewards(move.cell.rewards)),
      ),
      target: JOURNEY_ACHIEVEMENT_STREAK_TARGETS.lucky,
    },
  };
}
