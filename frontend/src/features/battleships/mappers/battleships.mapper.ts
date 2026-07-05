import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import type {
  BattleshipsBoardRules,
  BattleshipsPersistedGame,
  BattleshipsRules,
  BattleshipsSavedGameSummary,
  BattleshipsStatusChip,
} from "../types";

export function getBattleshipsBoardConfig(rules: BattleshipsRules): BattleshipsBoardRules | null {
  const boardKey = String(rules.selectedBoardSize);
  return rules.boards[boardKey] ?? Object.values(rules.boards)[0] ?? null;
}

export function createBattleshipsFleetSummary(boardConfig: BattleshipsBoardRules | null): string[] {
  if (!boardConfig) {
    return [];
  }

  return boardConfig.ships
    .filter((ship) => ship.amount > 0)
    .sort((left, right) => right.size - left.size)
    .map((ship) => `${ship.size}-пал. x${ship.amount}`);
}

export function formatBattleshipsTimestamp(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function createBattleshipsStatusChips(params: {
  game: BattleshipsPersistedGame | null;
  djName: string;
  selectedConfigName?: string;
}): BattleshipsStatusChip[] {
  const { game, djName, selectedConfigName } = params;
  const resolvedDjName = game?.djName?.trim() || djName.trim();
  const rulesetLabel = `${battleshipsTexts.statuses.rulesetPrefix} ${game?.configName ?? selectedConfigName ?? "Не выбран"}`;

  if (!game) {
    return [
      { label: battleshipsTexts.statuses.notStarted, color: "default" },
      { label: rulesetLabel, color: "secondary" },
      ...(resolvedDjName ? [{ label: `${battleshipsTexts.statuses.djPrefix} ${resolvedDjName}`, color: "info" as const }] : []),
    ];
  }

  const chips: BattleshipsStatusChip[] = [
    {
      label: game.derived.gameIsOver ? battleshipsTexts.statuses.complete : battleshipsTexts.statuses.active,
      color: game.derived.gameIsOver ? "success" : "default",
    },
    { label: rulesetLabel, color: "secondary" },
    { label: `${battleshipsTexts.statuses.playerPrefix} ${game.playerName}`, color: "primary" },
    { label: `${battleshipsTexts.statuses.attemptsPrefix} ${game.derived.attemptsLeft}`, color: "info" },
  ];

  if (resolvedDjName) {
    chips.push({ label: `${battleshipsTexts.statuses.djPrefix} ${resolvedDjName}`, color: "info" });
  }

  return chips;
}

export function getBattleshipsSavedGameStatusLabel(game: BattleshipsSavedGameSummary): string {
  return game.status === "finished" ? battleshipsTexts.statuses.complete : battleshipsTexts.statuses.active;
}
