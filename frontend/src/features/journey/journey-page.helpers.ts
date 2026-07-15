import { MOVE_TYPES } from "./config";
import { journeyTexts } from "../../texts/journeyTexts";
import type {
  JourneyAchievementProgress,
  JourneyAchievementsMap,
  JourneyBalance,
  JourneyConfig,
  JourneyCurrencyDefinition,
  JourneyCurrencyValue,
  JourneyPersistedGame,
  JourneyMapCell,
  JourneyMoveInputs,
  JourneyPlayer,
  JourneyPlayerReadModel,
  JourneyRulesCell,
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

export function normalizeJourneyCurrencyValues(values: JourneyCurrencyValue[]): JourneyCurrencyValue[] {
  const grouped = values.reduce<Map<string, number>>((result, value) => {
    const currencyId = value.currencyId.trim();

    if (!currencyId) {
      return result;
    }

    result.set(currencyId, (result.get(currencyId) ?? 0) + Math.trunc(value.value));
    return result;
  }, new Map<string, number>());

  return Array.from(grouped.entries()).map(([currencyId, value]) => ({
    currencyId,
    value,
  }));
}

export function formatJourneyCurrencyValues(
  values: JourneyCurrencyValue[],
  currencies: JourneyCurrencyDefinition[],
  options: {
    showPlus?: boolean;
    includeZero?: boolean;
    absolute?: boolean;
  } = {},
): string {
  const { showPlus = false, includeZero = true, absolute = false } = options;
  const valuesByCurrencyId = new Map(
    normalizeJourneyCurrencyValues(values).map((value) => [value.currencyId, absolute ? Math.abs(value.value) : value.value]),
  );

  return currencies
    .map((currency) => ({
      currency,
      value: Math.trunc(valuesByCurrencyId.get(currency.id) ?? 0),
    }))
    .filter(({ value }) => includeZero || value !== 0)
    .map(({ currency, value }) => `${showPlus && value > 0 ? "+" : ""}${value} ${currency.label}`)
    .join(", ");
}

export function getJourneyBalanceEntries(
  balance: JourneyBalance,
  currencies: JourneyCurrencyDefinition[],
): JourneyCurrencyValue[] {
  return currencies.map((currency) => ({
    currencyId: currency.id,
    value: Math.trunc(balance[currency.id] ?? 0),
  }));
}

export function getJourneyPlayerBalanceEntries(
  player: JourneyPlayer | JourneyPlayerReadModel,
  currencies: JourneyCurrencyDefinition[],
): JourneyCurrencyValue[] {
  if ("balanceEntries" in player && Array.isArray(player.balanceEntries)) {
    return player.balanceEntries;
  }

  return getJourneyBalanceEntries(player.balance, currencies);
}

export function getJourneyPlayerBalanceLabel(
  player: JourneyPlayer | JourneyPlayerReadModel,
  currencies: JourneyCurrencyDefinition[],
): string {
  return formatJourneyCurrencyValues(getJourneyPlayerBalanceEntries(player, currencies), currencies, {
    includeZero: true,
  });
}

export function hasPositiveJourneyRewards(values: JourneyCurrencyValue[]): boolean {
  return values.some((value) => value.value > 0);
}

export function hasNegativeJourneyRewards(values: JourneyCurrencyValue[]): boolean {
  return values.some((value) => value.value < 0);
}

function getCompactCurrencyLabel(currency: JourneyCurrencyDefinition): string {
  return currency.label.trim().slice(0, 1).toLowerCase() || currency.id.slice(0, 1).toLowerCase();
}

function getCompactRewardLabel(values: JourneyCurrencyValue[], currencies: JourneyCurrencyDefinition[]): string {
  const valuesByCurrencyId = new Map(normalizeJourneyCurrencyValues(values).map((value) => [value.currencyId, value.value]));

  return currencies
    .map((currency) => {
      const value = Math.trunc(valuesByCurrencyId.get(currency.id) ?? 0);
      if (!value) {
        return null;
      }

      return `${value > 0 ? "+" : ""}${value}${getCompactCurrencyLabel(currency)}`;
    })
    .filter((value): value is string => Boolean(value))
    .join("/");
}

export function getJourneyMapCell(index: number, gameMap: Record<number, JourneyMapCell>): JourneyMapCell | null {
  return gameMap[index] ?? null;
}

export function getJourneyCellLabel(cell: JourneyMapCell | null, currencies: JourneyCurrencyDefinition[]): string {
  if (!cell) {
    return "Пусто";
  }

  if (!cell.rewards.length) {
    return cell.isJackpot ? "Сокровище" : "Пусто";
  }

  const rewardsLabel = formatJourneyCurrencyValues(cell.rewards, currencies, {
    showPlus: cell.kind === "bonus",
    includeZero: false,
  });

  if (cell.isJackpot) {
    return `Сокровище ${rewardsLabel}`;
  }

  return `${cell.kind === "bonus" ? "Бонус" : "Ловушка"} ${rewardsLabel}`;
}

export function getCollectibleCellLabel(cell: JourneyRulesCell, currencies: JourneyCurrencyDefinition[]): string {
  return `${cell.kind === "bonus" ? "Бонус" : "Ловушка"} ${formatJourneyCurrencyValues(cell.rewards, currencies, {
    showPlus: cell.kind === "bonus",
    includeZero: false,
  })}`;
}

export function getJourneyVisiblePlayers(game: JourneyPersistedGame | null): JourneyPlayerReadModel[] {
  if (!game) {
    return [];
  }

  return (
    game.derived?.visiblePlayers ??
    game.players
      .filter((player) => player.status !== "removed")
      .map((player) => toJourneyPlayerReadModel(player, game.currencies))
  );
}

export function toJourneyPlayerReadModel(
  player: JourneyPlayer,
  currencies: JourneyCurrencyDefinition[],
): JourneyPlayerReadModel {
  return {
    ...player,
    balanceEntries: getJourneyBalanceEntries(player.balance, currencies),
  };
}

export function getJourneyActivePlayers(game: JourneyPersistedGame | null): JourneyPlayerReadModel[] {
  if (!game) {
    return [];
  }

  return (
    game.derived?.activePlayers ??
    game.players.filter((player) => player.status === "active").map((player) => toJourneyPlayerReadModel(player, game.currencies))
  );
}

export function getJourneyFinishedPlayers(game: JourneyPersistedGame | null): JourneyPlayerReadModel[] {
  if (!game) {
    return [];
  }

  return (
    game.derived?.finishedPlayers ??
    game.players.filter((player) => player.status === "finished").map((player) => toJourneyPlayerReadModel(player, game.currencies))
  );
}

export function getJourneyResults(game: JourneyPersistedGame | null): JourneyPlayerReadModel[] {
  if (!game) {
    return [];
  }

  return (
    game.derived?.results ??
    game.players
      .filter((player) => player.status !== "removed")
      .map((player) => toJourneyPlayerReadModel(player, game.currencies))
      .sort((left, right) => left.nickname.localeCompare(right.nickname, "ru"))
  );
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

export function getCompactCellLabel(
  cell: JourneyMapCell | null,
  currencies: JourneyCurrencyDefinition[],
): string {
  if (!cell) {
    return ".";
  }

  const compactLabel = getCompactRewardLabel(cell.rewards, currencies);
  if (compactLabel) {
    return compactLabel;
  }

  return cell.isJackpot ? "*" : ".";
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

  if (hasPositiveJourneyRewards(cell.rewards)) {
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

function isTrapProgressEntry(entry: JourneyTimelineEntry): boolean {
  return !entry.skipped && Boolean(entry.cell) && hasNegativeJourneyRewards(entry.cell.rewards);
}

function isLuckyProgressEntry(entry: JourneyTimelineEntry): boolean {
  return !entry.skipped && Boolean(entry.cell) && hasPositiveJourneyRewards(entry.cell.rewards);
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
  if (entry.skipped || entry.currentPosition === finishPosition || entry.moveType === MOVE_TYPES.JACKPOT) {
    return false;
  }

  if (!entry.cell) {
    return true;
  }

  if (entry.cell.isJackpot) {
    return true;
  }

  return entry.cell.rewards.length === 0;
}

export function getHistoryEntrySummary(
  entry: JourneyTimelineEntry,
  currencies: JourneyCurrencyDefinition[],
): string {
  if (entry.skipped) {
    return `${journeyTexts.timeline.turnPrefix} ${entry.roundIndex}: ${journeyTexts.timeline.skipSuffix}`;
  }

  const movement = `${entry.previousPosition} -> ${entry.currentPosition}`;
  const rewardLabel = formatJourneyCurrencyValues(entry.appliedRewards, currencies, {
    showPlus: hasPositiveJourneyRewards(entry.appliedRewards) && !hasNegativeJourneyRewards(entry.appliedRewards),
    absolute: hasNegativeJourneyRewards(entry.appliedRewards),
    includeZero: false,
  });
  const balanceLabel = formatJourneyCurrencyValues(entry.balanceAfterRound ?? [], currencies, {
    includeZero: true,
  });
  const cellPart = entry.cell?.isJackpot
    ? journeyTexts.timeline.treasure
    : entry.cell
      ? getJourneyCellLabel(entry.cell, currencies)
      : journeyTexts.timeline.empty;
  const rewardPart = rewardLabel || "0";

  return `${journeyTexts.timeline.turnPrefix} ${entry.roundIndex}: ${movement}, ${cellPart}, ${journeyTexts.timeline.change} ${rewardPart}, ${journeyTexts.timeline.total} [${balanceLabel}]`;
}

export function getAchievementProgress(
  player: JourneyPlayer,
  timeline: JourneyTimelineEntry[],
  collectibleCells: JourneyRulesCell[],
  journeyAchievements: JourneyAchievementsMap,
  finishPosition: number,
): JourneyAchievementProgress {
  const obtainedCellIds = [
    ...new Set(
      timeline
        .filter((entry) => !entry.skipped && entry.cell && !entry.cell.isJackpot && typeof entry.cell.id === "string")
        .map((entry) => entry.cell!.id),
    ),
  ];
  const missingCellIds = collectibleCells
    .map((cell) => cell.id)
    .filter((cellId) => !obtainedCellIds.includes(cellId));

  return {
    collector: {
      achieved: player.bonuses.some((bonus) => bonus.name === journeyAchievements.COLLECTOR.name),
      obtainedCellIds,
      missingCellIds,
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
