import { normalizeCurrencyValues } from "../../../common/currencyValues";
import type {
  BattleshipsBoardRules,
  BattleshipsBoardRulesInput,
  BattleshipsCurrencyValue,
  BattleshipsRules,
  BattleshipsRulesInput,
  BattleshipsShipConfig,
} from "./types";

const CYRILLIC_BOARD_LETTERS = [
  "А",
  "Б",
  "В",
  "Г",
  "Д",
  "Е",
  "Ж",
  "З",
  "И",
  "К",
  "Л",
  "М",
  "Н",
  "О",
  "П",
  "Р",
  "С",
  "Т",
  "У",
  "Ф",
  "Х",
  "Ц",
  "Ч",
  "Ш",
  "Щ",
  "Ъ",
  "Ы",
  "Ь",
  "Э",
  "Ю",
  "Я",
];

const DEFAULT_BOARD_RULES: BattleshipsBoardRules = {
  boardSize: 6,
  ships: [
    { size: 4, amount: 0 },
    { size: 3, amount: 1 },
    { size: 2, amount: 2 },
    { size: 1, amount: 4 },
  ],
  maxShots: 17,
  prizes: {
    shoot: [{ currencyId: "default", value: 2 }],
    destroyBonus: {
      1: [{ currencyId: "default", value: 1 }],
      2: [{ currencyId: "default", value: 1 }],
      3: [{ currencyId: "default", value: 2 }],
      4: [{ currencyId: "default", value: 2 }],
    },
  },
};

export const DEFAULT_BATTLESHIPS_RULES: BattleshipsRules = {
  selectedBoardSize: DEFAULT_BOARD_RULES.boardSize,
  boards: {
    [String(DEFAULT_BOARD_RULES.boardSize)]: structuredClone(DEFAULT_BOARD_RULES),
  },
};

export function normalizeBattleshipsRules(input: BattleshipsRulesInput = {}): BattleshipsRules {
  const sourceBoards = input.boards && Object.keys(input.boards).length ? input.boards : { 6: DEFAULT_BOARD_RULES };
  const normalizedBoards = Object.fromEntries(
    Object.entries(sourceBoards).map(([boardKey, boardRules]) => {
      const normalizedBoard = normalizeBattleshipsBoardRules(boardRules, boardKey);
      return [String(normalizedBoard.boardSize), normalizedBoard];
    }),
  );

  const fallbackBoardKey = Object.keys(normalizedBoards)[0] ?? String(DEFAULT_BOARD_RULES.boardSize);
  const requestedBoardKey = String(input.selectedBoardSize ?? fallbackBoardKey);
  const selectedBoardKey = normalizedBoards[requestedBoardKey] ? requestedBoardKey : fallbackBoardKey;

  return {
    selectedBoardSize: Number(selectedBoardKey),
    boards: normalizedBoards,
  };
}

export function getBattleshipsBoardConfig(rules: BattleshipsRules): BattleshipsBoardRules {
  const normalizedRules = normalizeBattleshipsRules(rules);
  return normalizedRules.boards[String(normalizedRules.selectedBoardSize)];
}

export function getBattleshipsBoardLetters(boardSize: number): string[] {
  return Array.from({ length: boardSize }, (_, index) => CYRILLIC_BOARD_LETTERS[index] ?? String(index + 1));
}

export function toBattleshipsCoordinateLabel(row: number, column: number, boardSize?: number): string {
  const letters = getBattleshipsBoardLetters(boardSize ?? row);
  return `${letters[row - 1] ?? String(row)}${column}`;
}

export function formatBattleshipsShotResult(result: "miss" | "hit" | "kill"): string {
  switch (result) {
    case "hit":
      return "Ранен";
    case "kill":
      return "Убит";
    default:
      return "Мимо";
  }
}

export function buildBattleshipsFleetSummary(boardConfig: BattleshipsBoardRules): string[] {
  return boardConfig.ships
    .filter((ship) => ship.amount > 0)
    .sort((left, right) => right.size - left.size)
    .map((ship) => `${ship.size}-пал. x${ship.amount}`);
}

function normalizeBattleshipsBoardRules(
  input: BattleshipsBoardRulesInput = {},
  boardKey: string,
): BattleshipsBoardRules {
  const resolvedBoardSize = normalizePositiveInteger(input.boardSize ?? Number(boardKey) ?? DEFAULT_BOARD_RULES.boardSize);
  const ships = normalizeShips(input.ships ?? DEFAULT_BOARD_RULES.ships);
  const destroyBonus = normalizeDestroyBonus(input.prizes?.destroyBonus, ships);

  return {
    boardSize: resolvedBoardSize,
    ships,
    maxShots: normalizeNonNegativeInteger(input.maxShots ?? DEFAULT_BOARD_RULES.maxShots),
    prizes: {
      shoot: normalizeSingleDecimalRewardSet(input.prizes?.shoot ?? DEFAULT_BOARD_RULES.prizes.shoot, DEFAULT_BOARD_RULES.prizes.shoot),
      destroyBonus,
    },
  };
}

function normalizeShips(ships: BattleshipsShipConfig[]): BattleshipsShipConfig[] {
  return ships
    .map((ship) => ({
      size: normalizePositiveInteger(ship.size),
      amount: normalizeNonNegativeInteger(ship.amount),
    }))
    .sort((left, right) => right.size - left.size);
}

function normalizeDestroyBonus(
  input: Record<string | number, BattleshipsCurrencyValue[]> | undefined,
  ships: BattleshipsShipConfig[],
): Record<number, BattleshipsCurrencyValue[]> {
  const sizes = new Set<number>([
    ...Object.keys(DEFAULT_BOARD_RULES.prizes.destroyBonus).map((value) => Number(value)),
    ...ships.map((ship) => ship.size),
  ]);

  return Array.from(sizes).reduce<Record<number, BattleshipsCurrencyValue[]>>((result, size) => {
    const fallback = DEFAULT_BOARD_RULES.prizes.destroyBonus[size] ?? DEFAULT_BOARD_RULES.prizes.destroyBonus[1];
    const value = input?.[size] ?? input?.[String(size)] ?? fallback ?? [];
    result[size] = normalizeHalfStepRewardSet(value, fallback);
    return result;
  }, {});
}

function normalizePositiveInteger(value: number): number {
  const numericValue = Number(value);
  return Math.max(1, Math.floor(Number.isFinite(numericValue) ? numericValue : 1));
}

function normalizeNonNegativeInteger(value: number): number {
  const numericValue = Number(value);
  return Math.max(0, Math.floor(Number.isFinite(numericValue) ? numericValue : 0));
}

function normalizeSingleDecimalRewardSet(values: BattleshipsCurrencyValue[], fallback: BattleshipsCurrencyValue[]): BattleshipsCurrencyValue[] {
  const normalizedValues = normalizeCurrencyValues(values).map((entry) => ({
    currencyId: entry.currencyId,
    value: normalizeNonNegativeSingleDecimal(entry.value),
  }));

  return normalizedValues.length ? normalizedValues : structuredClone(fallback);
}

function normalizeHalfStepRewardSet(values: BattleshipsCurrencyValue[], fallback: BattleshipsCurrencyValue[]): BattleshipsCurrencyValue[] {
  const normalizedValues = normalizeCurrencyValues(values).map((entry) => ({
    currencyId: entry.currencyId,
    value: normalizeNonNegativeHalfStep(entry.value),
  }));

  return normalizedValues.length ? normalizedValues : structuredClone(fallback);
}

function normalizeNonNegativeSingleDecimal(value: number): number {
  const numericValue = Number(value);
  const normalizedValue = Number.isFinite(numericValue) ? numericValue : 0;
  return Math.max(0, Math.round(normalizedValue * 10) / 10);
}

function normalizeNonNegativeHalfStep(value: number): number {
  const numericValue = Number(value);
  const normalizedValue = Number.isFinite(numericValue) ? numericValue : 0;
  return Math.max(0, Math.round(normalizedValue * 2) / 2);
}
