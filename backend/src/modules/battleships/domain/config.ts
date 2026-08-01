import { validateRewardPool, type Resource, type RewardPool } from "../../rewards";
import type {
  BattleshipsBoardRules,
  BattleshipsBoardRulesInput,
  BattleshipsRules,
  BattleshipsRulesInput,
  BattleshipsShipConfig,
} from "./types";

const CYRILLIC_BOARD_LETTERS = ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З", "И", "К", "Л", "М", "Н", "О", "П", "Р", "С", "Т", "У", "Ф", "Х", "Ц", "Ч", "Ш", "Щ", "Ъ", "Ы", "Ь", "Э", "Ю", "Я"];
const all = (...rewards: Array<{ resourceId: string; amount: number }>): RewardPool => ({ mode: "all", rewards });
const clone = <T>(value: T): T => structuredClone(value);

const DEFAULT_BOARD_RULES: BattleshipsBoardRules = {
  boardSize: 6,
  ships: [{ size: 4, amount: 0 }, { size: 3, amount: 1 }, { size: 2, amount: 2 }, { size: 1, amount: 4 }],
  maxShots: 17,
  rewards: {
    hit: all({ resourceId: "default", amount: 2 }),
    destroyBonusByShipSize: { 1: all({ resourceId: "default", amount: 1 }), 2: all({ resourceId: "default", amount: 1 }), 3: all({ resourceId: "default", amount: 2 }), 4: all({ resourceId: "default", amount: 2 }) },
  },
};

export const DEFAULT_BATTLESHIPS_RULES: BattleshipsRules = { selectedBoardSize: DEFAULT_BOARD_RULES.boardSize, boards: { [String(DEFAULT_BOARD_RULES.boardSize)]: clone(DEFAULT_BOARD_RULES) } };

export function normalizeBattleshipsRules(input: BattleshipsRulesInput = {}): BattleshipsRules {
  const sourceBoards = input.boards && Object.keys(input.boards).length ? input.boards : { 6: DEFAULT_BOARD_RULES };
  const normalizedBoards = Object.fromEntries(Object.entries(sourceBoards).map(([key, board]) => {
    const normalized = normalizeBattleshipsBoardRules(board, key);
    return [String(normalized.boardSize), normalized];
  }));
  const fallback = Object.keys(normalizedBoards)[0] ?? String(DEFAULT_BOARD_RULES.boardSize);
  const requested = String(input.selectedBoardSize ?? fallback);
  return { selectedBoardSize: Number(normalizedBoards[requested] ? requested : fallback), boards: normalizedBoards };
}

export function getBattleshipsBoardConfig(rules: BattleshipsRules): BattleshipsBoardRules {
  const normalized = normalizeBattleshipsRules(rules);
  return normalized.boards[String(normalized.selectedBoardSize)];
}
export function getBattleshipsBoardLetters(boardSize: number): string[] { return Array.from({ length: boardSize }, (_, index) => CYRILLIC_BOARD_LETTERS[index] ?? String(index + 1)); }
export function toBattleshipsCoordinateLabel(row: number, column: number, boardSize?: number): string { return `${getBattleshipsBoardLetters(boardSize ?? row)[row - 1] ?? String(row)}${column}`; }
export function formatBattleshipsShotResult(result: "miss" | "hit" | "kill"): string { return result === "hit" ? "Ранен" : result === "kill" ? "Убит" : "Мимо"; }
export function buildBattleshipsFleetSummary(boardConfig: BattleshipsBoardRules): string[] { return boardConfig.ships.filter((ship) => ship.amount > 0).sort((left, right) => right.size - left.size).map((ship) => `${ship.size}-пал. x${ship.amount}`); }

export function validateBattleshipsRules(rules: BattleshipsRules, resources: readonly Resource[]): void {
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  Object.values(rules.boards).forEach((board) => {
    const validatePositivePool = (pool: RewardPool, context: string) => {
      validateRewardPool(pool, resourcesById);
      const rewards = pool.mode === "all" ? pool.rewards : pool.mode === "weighted_one" ? pool.options.flatMap((option) => option.reward ? [option.reward] : []) : pool.options.map((option) => option.reward);
      if (rewards.some((reward) => reward.amount < 0)) throw new Error(`${context}: Battleships rewards must be positive`);
    };
    validatePositivePool(board.rewards.hit, `Board ${board.boardSize} hit reward`);
    Object.entries(board.rewards.destroyBonusByShipSize).forEach(([size, pool]) => validatePositivePool(pool, `Board ${board.boardSize} destroy bonus ${size}`));
  });
}

function normalizeBattleshipsBoardRules(input: BattleshipsBoardRulesInput = {}, boardKey: string): BattleshipsBoardRules {
  const boardSize = positiveInteger(input.boardSize ?? Number(boardKey) ?? DEFAULT_BOARD_RULES.boardSize);
  const ships = normalizeShips(input.ships ?? DEFAULT_BOARD_RULES.ships);
  const legacyPrizes = input.prizes;
  const hit = normalizePool(input.rewards?.hit, legacyPrizes?.shoot, DEFAULT_BOARD_RULES.rewards.hit);
  const sizes = new Set([...Object.keys(DEFAULT_BOARD_RULES.rewards.destroyBonusByShipSize).map(Number), ...ships.map((ship) => ship.size)]);
  const destroyBonusByShipSize = Array.from(sizes).reduce<Record<number, RewardPool>>((result, size) => {
    const legacy = legacyPrizes?.destroyBonus?.[size] ?? legacyPrizes?.destroyBonus?.[String(size)];
    result[size] = normalizePool(input.rewards?.destroyBonusByShipSize?.[size], legacy, DEFAULT_BOARD_RULES.rewards.destroyBonusByShipSize[size] ?? DEFAULT_BOARD_RULES.rewards.destroyBonusByShipSize[1]);
    return result;
  }, {});
  return { boardSize, ships, maxShots: nonNegativeInteger(input.maxShots ?? DEFAULT_BOARD_RULES.maxShots), rewards: { hit, destroyBonusByShipSize } };
}
function normalizePool(pool: RewardPool | undefined, legacyValues: Array<{ currencyId: string; value: number }> | undefined, fallback: RewardPool): RewardPool {
  if (pool && typeof pool === "object" && "mode" in pool) return clone(pool);
  if (Array.isArray(legacyValues)) return { mode: "all", rewards: legacyValues.filter((value) => typeof value.currencyId === "string" && Number.isFinite(value.value)).map((value) => ({ resourceId: value.currencyId, amount: value.value })) };
  return clone(fallback);
}
function normalizeShips(ships: BattleshipsShipConfig[]): BattleshipsShipConfig[] { return ships.map((ship) => ({ size: positiveInteger(ship.size), amount: nonNegativeInteger(ship.amount) })).sort((left, right) => right.size - left.size); }
function positiveInteger(value: number): number { return Math.max(1, Math.floor(Number.isFinite(Number(value)) ? Number(value) : 1)); }
function nonNegativeInteger(value: number): number { return Math.max(0, Math.floor(Number.isFinite(Number(value)) ? Number(value) : 0)); }
