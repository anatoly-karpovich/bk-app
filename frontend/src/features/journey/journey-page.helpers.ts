import { journeyTexts } from "../../texts/journeyTexts";
import type {
  JourneyCollectorTarget,
  JourneyConfig,
  JourneyMapCell,
  JourneyMoveInputs,
  JourneyPageGame,
  JourneyPlayerReadModel,
  JourneyResourceAmount,
  JourneyResourceDefinition,
  JourneySkippedPlayers,
  JourneyTimelineEntry,
  RewardPool,
} from "./types";

export function createEmptyMoveState(players: Array<{ id: string }> = []): JourneyMoveInputs {
  return Object.fromEntries(players.map((player) => [player.id, ""]));
}

export function createEmptySkipState(players: Array<{ id: string }> = []): JourneySkippedPlayers {
  return Object.fromEntries(players.map((player) => [player.id, false]));
}

export function getPlayerNameErrors(playerNames: string[]): string[] {
  const normalizedNames = playerNames.map((name) => name.trim());
  return playerNames.map((name, index) => {
    if (!name.trim()) return journeyTexts.validation.fillNickname;
    return normalizedNames.filter((current) => current === normalizedNames[index]).length > 1
      ? journeyTexts.validation.duplicateNickname
      : "";
  });
}

export function isValidDiceValue(value: string, journeyConfig: JourneyConfig): boolean {
  const dice = Number(value);
  return Number.isInteger(dice) && dice >= journeyConfig.minDice && dice <= journeyConfig.maxDice;
}

export function normalizeJourneyResourceAmounts(
  values: readonly JourneyResourceAmount[] = [],
): JourneyResourceAmount[] {
  const grouped = values.reduce<Map<string, number>>((result, value) => {
    if (!value.resourceId) return result;
    result.set(value.resourceId, (result.get(value.resourceId) ?? 0) + value.amount);
    return result;
  }, new Map());
  return [...grouped].map(([resourceId, amount]) => ({ resourceId, amount }));
}

export function formatJourneyResourceAmounts(
  values: readonly JourneyResourceAmount[] = [],
  resources: readonly JourneyResourceDefinition[],
  options: { showPlus?: boolean; includeZero?: boolean; absolute?: boolean } = {},
): string {
  const { showPlus = false, includeZero = true, absolute = false } = options;
  const valuesByResourceId = new Map(
    normalizeJourneyResourceAmounts(values).map(({ resourceId, amount }) => [
      resourceId,
      absolute ? Math.abs(amount) : amount,
    ]),
  );
  const knownAmounts = resources.map((resource) => ({ resource, amount: valuesByResourceId.get(resource.id) ?? 0 }));
  const unknownAmounts = [...valuesByResourceId]
    .filter(([resourceId]) => !resources.some((resource) => resource.id === resourceId))
    .map(([resourceId, amount]) => ({ resource: { id: resourceId, label: resourceId }, amount }));

  return [...knownAmounts, ...unknownAmounts]
    .filter(({ amount }) => includeZero || amount !== 0)
    .map(({ resource, amount }) => resource.type === "item"
      ? `${resource.label} ×${Math.abs(amount)}`
      : `${showPlus && amount > 0 ? "+" : ""}${amount} ${resource.label}`)
    .join(", ");
}

export function getRewardPoolAmounts(pool: RewardPool | null | undefined): JourneyResourceAmount[] {
  if (!pool) return [];
  if (pool.mode === "all") return pool.rewards;
  if (pool.mode === "weighted_one") return pool.options.flatMap((option) => (option.reward ? [option.reward] : []));
  return pool.options.map((option) => option.reward);
}

export function formatJourneyRewardPool(
  pool: RewardPool | null | undefined,
  resources: readonly JourneyResourceDefinition[],
): string {
  if (!pool) return journeyTexts.timeline.empty;
  if (pool.mode === "all") return formatJourneyResourceAmounts(pool.rewards, resources, { includeZero: false });
  if (pool.mode === "weighted_one") {
    return pool.options
      .map((option) =>
        option.reward ? formatJourneyResourceAmounts([option.reward], resources, { includeZero: false }) : "ничего",
      )
      .join(" / ");
  }
  return pool.options
    .map(
      (option) =>
        `${formatJourneyResourceAmounts([option.reward], resources, { includeZero: false })} (${option.chanceBps / 100}%)`,
    )
    .join(", ");
}

export function getJourneyPlayerBalanceEntries(player: JourneyPlayerReadModel): JourneyResourceAmount[] {
  return player.balanceEntries;
}

export function getJourneyPlayerBalanceLabel(
  player: JourneyPlayerReadModel,
  resources: readonly JourneyResourceDefinition[],
): string {
  return formatJourneyResourceAmounts(getJourneyPlayerBalanceEntries(player), resources, { includeZero: true });
}

export function hasPositiveJourneyRewards(values: readonly JourneyResourceAmount[] = []): boolean {
  return values.some((value) => value.amount > 0);
}

export function hasNegativeJourneyRewards(values: readonly JourneyResourceAmount[] = []): boolean {
  return values.some((value) => value.amount < 0);
}

export function getJourneyMapCell(index: number, gameMap: Record<number, JourneyMapCell>): JourneyMapCell | null {
  return gameMap[index] ?? null;
}

export function getJourneyCellLabel(
  cell: JourneyMapCell | null,
  resources: readonly JourneyResourceDefinition[],
): string {
  if (!cell) return "Пусто";
  const rewardLabel = formatJourneyRewardPool(cell.rewardPool, resources);
  if (!rewardLabel) return cell.isJackpot ? "Сокровище" : "Пусто";
  if (cell.isJackpot) return `Сокровище ${rewardLabel}`;
  return `${cell.kind === "bonus" ? "Бонус" : "Ловушка"} ${rewardLabel}`;
}

export function getCollectorTargetLabel(
  target: JourneyCollectorTarget,
  resources: readonly JourneyResourceDefinition[],
): string {
  if (target.kind === "empty") return journeyTexts.timeline.empty;
  return `${target.kind === "bonus" ? "Бонус" : "Ловушка"} ${formatJourneyRewardPool(target.rewardPool, resources)}`;
}

export function getJourneyVisiblePlayers(game: JourneyPageGame | null): JourneyPlayerReadModel[] {
  return game?.visiblePlayers ?? [];
}
export function getJourneyActivePlayers(game: JourneyPageGame | null): JourneyPlayerReadModel[] {
  return game?.activePlayers ?? [];
}
export function getJourneyFinishedPlayers(game: JourneyPageGame | null): JourneyPlayerReadModel[] {
  return game?.finishedPlayers ?? [];
}
export function getJourneyResults(game: JourneyPageGame | null): JourneyPlayerReadModel[] {
  return game?.results ?? [];
}
export function isJourneyGameOver(game: JourneyPageGame | null): boolean {
  return game?.gameIsOver ?? false;
}
export function getJourneyPlayerTimelines(game: JourneyPageGame | null): Record<string, JourneyTimelineEntry[]> {
  return game?.playerTimelines ?? {};
}

export function getCompactCellLabel(cell: JourneyMapCell | null): string {
  if (!cell) return ".";
  if (cell.isJackpot) return "🏆";
  return cell.mapLabel ?? "?";
}

export function getCompactCellTone(cell: JourneyMapCell | null) {
  if (!cell) return { backgroundColor: "#ffffff", borderColor: "rgba(15, 23, 42, 0.08)", color: "#475569" };
  if (cell.isJackpot)
    return { backgroundColor: "rgba(245, 158, 11, 0.14)", borderColor: "rgba(245, 158, 11, 0.35)", color: "#b45309" };
  return cell.kind === "bonus"
    ? { backgroundColor: "rgba(22, 163, 74, 0.12)", borderColor: "rgba(22, 163, 74, 0.24)", color: "#15803d" }
    : { backgroundColor: "rgba(220, 38, 38, 0.08)", borderColor: "rgba(220, 38, 38, 0.22)", color: "#dc2626" };
}

export function shortenNickname(nickname: string): string {
  return nickname.length <= 10 ? nickname : `${nickname.slice(0, 8)}...`;
}

export function getHistoryEntrySummary(
  entry: JourneyTimelineEntry,
  resources: readonly JourneyResourceDefinition[],
): string {
  if (entry.skipped)
    return `${journeyTexts.timeline.turnPrefix} ${entry.roundIndex}: ${journeyTexts.timeline.skipSuffix}`;
  const movement = `${entry.previousPosition} -> ${entry.currentPosition}`;
  const rewardLabel = formatJourneyResourceAmounts(entry.appliedRewards, resources, {
    showPlus: hasPositiveJourneyRewards(entry.appliedRewards) && !hasNegativeJourneyRewards(entry.appliedRewards),
    absolute: hasNegativeJourneyRewards(entry.appliedRewards),
    includeZero: false,
  });
  const balanceLabel = formatJourneyResourceAmounts(entry.balanceAfterRound ?? [], resources, { includeZero: true });
  const cellPart = entry.cell?.isJackpot
    ? journeyTexts.timeline.treasure
    : entry.cell
      ? getJourneyCellLabel(entry.cell, resources)
      : journeyTexts.timeline.empty;
  return `${journeyTexts.timeline.turnPrefix} ${entry.roundIndex}: ${movement}, ${cellPart}, ${journeyTexts.timeline.change} ${rewardLabel || "0"}, ${journeyTexts.timeline.total} [${balanceLabel}]`;
}
