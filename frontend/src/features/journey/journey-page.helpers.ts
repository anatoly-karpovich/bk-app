import { journeyTexts } from "../../texts/journeyTexts";
import type {
  JourneyAchievementProgress,
  JourneyAchievementsMap,
  JourneyConfig,
  JourneyMapCell,
  JourneyMoveInputs,
  JourneyPlayer,
  JourneySkippedPlayers,
  JourneyTimelineEntry,
} from "./types";

export function createEmptyMoveState(players: JourneyPlayer[] = []): JourneyMoveInputs {
  return players.reduce<JourneyMoveInputs>((accumulator, player) => {
    accumulator[player.nickname] = "";
    return accumulator;
  }, {});
}

export function createEmptySkipState(players: JourneyPlayer[] = []): JourneySkippedPlayers {
  return players.reduce<JourneySkippedPlayers>((accumulator, player) => {
    accumulator[player.nickname] = false;
    return accumulator;
  }, {});
}

export function getPlayerNameErrors(playerNames: string[]): string[] {
  const normalizedNames = playerNames.map((name) => name.trim());

  return playerNames.map((name, index) => {
    if (!name.trim()) {
      return journeyTexts.validation.fillNickname;
    }

    if (normalizedNames.filter((current) => current === normalizedNames[index]).length > 1) {
      return journeyTexts.validation.duplicateNickname;
    }

    return "";
  });
}

export function isValidDiceValue(value: string, journeyConfig: JourneyConfig): boolean {
  const dice = Number(value);
  return Number.isInteger(dice) && dice >= journeyConfig.minDice && dice <= journeyConfig.maxDice;
}

function isTrapProgressEntry(entry: JourneyTimelineEntry): boolean {
  return !entry.skipped && Boolean(entry.cell) && entry.cell.prize < 0;
}

function isLuckyProgressEntry(entry: JourneyTimelineEntry): boolean {
  return !entry.skipped && Boolean(entry.cell) && entry.cell.prize > 0;
}

function getBestStreak(entries: JourneyTimelineEntry[], predicate: (entry: JourneyTimelineEntry) => boolean): number {
  let current = 0;
  let best = 0;

  entries.forEach((entry) => {
    if (predicate(entry)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });

  return best;
}

function getCurrentStreak(entries: JourneyTimelineEntry[], predicate: (entry: JourneyTimelineEntry) => boolean): number {
  let current = 0;

  [...entries].reverse().some((entry) => {
    if (predicate(entry)) {
      current += 1;
      return false;
    }

    return true;
  });

  return current;
}

function isCarefulProgressEntry(entry: JourneyTimelineEntry, finishPosition: number): boolean {
  if (entry.skipped || entry.currentPosition === finishPosition || entry.moveType === "moveWithJackpot") {
    return false;
  }

  if (!entry.cell) {
    return true;
  }

  if (entry.cell.isJackpot) {
    return true;
  }

  return !entry.cell.prize;
}

export function getPrizeBadgeLabel(prize: number): string {
  return prize > 0 ? `+${prize}` : `${prize}`;
}

export function getCompactCellLabel(cell: JourneyMapCell | null): string {
  if (!cell) {
    return ".";
  }

  if (cell.isJackpot) {
    return "*";
  }

  return cell.prize > 0 ? `+${cell.prize}` : `${cell.prize}`;
}

export function getCompactCellTone(cell: JourneyMapCell | null) {
  if (!cell) {
    return {
      backgroundColor: "#ffffff",
      borderColor: "rgba(15, 23, 42, 0.08)",
      color: "#475569",
    };
  }

  if (cell.isJackpot) {
    return {
      backgroundColor: "rgba(245, 158, 11, 0.14)",
      borderColor: "rgba(245, 158, 11, 0.35)",
      color: "#b45309",
    };
  }

  if (cell.prize > 0) {
    return {
      backgroundColor: "rgba(22, 163, 74, 0.12)",
      borderColor: "rgba(22, 163, 74, 0.24)",
      color: "#15803d",
    };
  }

  return {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderColor: "rgba(220, 38, 38, 0.22)",
    color: "#dc2626",
  };
}

export function shortenNickname(nickname: string): string {
  if (nickname.length <= 10) {
    return nickname;
  }

  return `${nickname.slice(0, 8)}...`;
}

export function getHistoryEntrySummary(entry: JourneyTimelineEntry): string {
  if (entry.skipped) {
    return `${journeyTexts.timeline.turnPrefix} ${entry.roundIndex}: ${journeyTexts.timeline.skipSuffix}`;
  }

  const movement = `${entry.previousPosition} -> ${entry.currentPosition}`;
  const prizePart =
    entry.prizeAfterMove! > entry.previousPrize!
      ? `+${entry.prizeAfterMove! - entry.previousPrize!}`
      : entry.prizeAfterMove! < entry.previousPrize!
        ? `${entry.prizeAfterMove! - entry.previousPrize!}`
        : "0";

  const cellPart = entry.cell?.isJackpot
    ? journeyTexts.timeline.treasure
    : entry.cell
      ? entry.cell.prize > 0
        ? `${journeyTexts.timeline.bonusPrefix} ${entry.cell.prize > 0 ? `+${entry.cell.prize}` : entry.cell.prize}`
        : `${journeyTexts.timeline.trapPrefix} ${entry.cell.prize}`
      : journeyTexts.timeline.empty;

  return `${journeyTexts.timeline.turnPrefix} ${entry.roundIndex}: ${movement}, ${cellPart}, ${journeyTexts.timeline.change} ${prizePart}, ${journeyTexts.timeline.total} ${entry.fullPrizeAfterRound}`;
}

export function getAchievementProgress(
  player: JourneyPlayer,
  timeline: JourneyTimelineEntry[],
  nonJackpotPrizes: number[],
  journeyAchievements: JourneyAchievementsMap,
  finishPosition: number,
): JourneyAchievementProgress {
  const obtainedPrizes = [
    ...new Set(
      timeline
        .filter((entry) => !entry.skipped && entry.cell && !entry.cell.isJackpot && typeof entry.cell.prize === "number" && entry.cell.prize !== 0)
        .map((entry) => entry.cell!.prize),
    ),
  ];
  const missingPrizes = nonJackpotPrizes.filter((prize) => !obtainedPrizes.includes(prize));

  return {
    collector: {
      achieved: player.bonuses.some((bonus) => bonus.name === journeyAchievements.COLLECTOR.name),
      obtainedPrizes,
      missingPrizes,
    },
    unlucky: {
      achieved: player.bonuses.some((bonus) => bonus.name === journeyAchievements.UNLUCKY.name),
      current: getCurrentStreak(timeline, isTrapProgressEntry),
      best: getBestStreak(timeline, isTrapProgressEntry),
      target: 3,
    },
    careful: {
      achieved: player.bonuses.some((bonus) => bonus.name === journeyAchievements.CAREFUL.name),
      current: getCurrentStreak(timeline, (entry) => isCarefulProgressEntry(entry, finishPosition)),
      best: getBestStreak(timeline, (entry) => isCarefulProgressEntry(entry, finishPosition)),
      target: 3,
    },
    lucky: {
      achieved: player.bonuses.some((bonus) => bonus.name === journeyAchievements.LUCKY.name),
      current: getCurrentStreak(timeline, isLuckyProgressEntry),
      best: getBestStreak(timeline, isLuckyProgressEntry),
      target: 5,
    },
  };
}
