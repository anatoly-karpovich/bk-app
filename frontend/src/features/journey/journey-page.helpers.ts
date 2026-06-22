import { journeyTexts } from "../../texts/journeyTexts";
import type {
  JourneyAchievementProgress,
  JourneyAchievementsMap,
  JourneyConfig,
  JourneyPersistedGame,
  JourneyMapCell,
  JourneyMoveInputs,
  JourneyPlayer,
  JourneyPlayerReadModel,
  JourneyReceiptsDistribution,
  JourneySkippedPlayers,
  JourneyTimelineEntry,
} from "./types";

export function createEmptyMoveState(players: JourneyPlayer[] = []): JourneyMoveInputs {
  return players.reduce<JourneyMoveInputs>((accumulator, player) => {
    accumulator[player.id] = "";
    return accumulator;
  }, {});
}

export function createEmptySkipState(players: JourneyPlayer[] = []): JourneySkippedPlayers {
  return players.reduce<JourneySkippedPlayers>((accumulator, player) => {
    accumulator[player.id] = false;
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

export function getJourneyPlayerFullPrize(player: Pick<JourneyPlayer, "prize" | "bonuses">): number {
  return player.prize + player.bonuses.reduce((sum, bonus) => sum + bonus.prize, 0);
}

export function getJourneyMapCell(index: number, gameMap: Record<number, JourneyMapCell>): JourneyMapCell | null {
  return gameMap[index] ?? null;
}

export function getJourneyCellLabel(cell: JourneyMapCell | null): string {
  if (!cell) {
    return "Пусто";
  }

  if (cell.isJackpot) {
    return "Сокровище";
  }

  if (cell.prize > 0) {
    return `Бонус +${cell.prize}`;
  }

  return `Ловушка ${cell.prize}`;
}

export function getJourneyVisiblePlayers(game: JourneyPersistedGame | null): JourneyPlayerReadModel[] {
  return (
    game?.derived?.visiblePlayers ??
    game?.players
      .filter((player) => player.status !== "removed")
      .map(toJourneyPlayerReadModel) ??
    []
  );
}

export function toJourneyPlayerReadModel(player: JourneyPlayer): JourneyPlayerReadModel {
  return {
    ...player,
    fullPrize: getJourneyPlayerFullPrize(player),
  };
}

export function getJourneyActivePlayers(game: JourneyPersistedGame | null): JourneyPlayerReadModel[] {
  return game?.derived?.activePlayers ?? game?.players.filter((player) => player.status === "active").map(toJourneyPlayerReadModel) ?? [];
}

export function getJourneyFinishedPlayers(game: JourneyPersistedGame | null): JourneyPlayerReadModel[] {
  return game?.derived?.finishedPlayers ?? game?.players.filter((player) => player.status === "finished").map(toJourneyPlayerReadModel) ?? [];
}

export function getJourneyResults(game: JourneyPersistedGame | null): JourneyPlayerReadModel[] {
  if (!game) {
    return [];
  }

  return (
    game?.derived?.results ??
    game.players
      .filter((player) => player.status !== "removed")
      .map(toJourneyPlayerReadModel)
      .sort((left, right) => right.fullPrize - left.fullPrize)
  );
}

export function calculateReceiptsDistribution(game: JourneyPersistedGame | null): JourneyReceiptsDistribution | null {
  if (!game) {
    return null;
  }

  if (game.derived?.receipts) {
    return game.derived.receipts;
  }

  const receiptTypes = [200, 100, 50, 20, 10, 5, 1] as const;
  const result: JourneyReceiptsDistribution = {
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  };

  getJourneyResults(game).forEach((player) => {
    let amount = player.fullPrize;

    receiptTypes.forEach((receipt) => {
      while (amount - receipt >= 0) {
        result[receipt] += 1;
        amount -= receipt;
      }
    });
  });

  return result;
}

export function isJourneyGameOver(game: JourneyPersistedGame | null): boolean {
  if (!game) {
    return false;
  }

  return game.derived?.gameIsOver ?? getJourneyActivePlayers(game).length === 0;
}

export function getJourneyPlayerTimelines(game: JourneyPersistedGame | null): Record<string, JourneyTimelineEntry[]> {
  if (!game) {
    return {};
  }

  if (game.derived?.playerTimelines) {
    return game.derived.playerTimelines;
  }

  return game.players.reduce<Record<string, JourneyTimelineEntry[]>>((accumulator, player) => {
    accumulator[player.id] = game.rounds.flatMap((round) =>
      (round.entries ?? [])
        .filter((entry) => entry.playerId === player.id || entry.nickname === player.nickname)
        .map((entry) => ({
          ...entry,
          roundIndex: round.moveIndex,
        })),
    );

    return accumulator;
  }, {});
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
