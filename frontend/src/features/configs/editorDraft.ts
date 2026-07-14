import type { AppConfig, AppConfigEditorState, AppConfigMutationPayload, BattleshipsBoardEditorState } from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sortBoardDrafts(boards: BattleshipsBoardEditorState[]) {
  return [...boards].sort((left, right) => left.boardSize - right.boardSize);
}

function hasAtMostOneDecimalPlace(value: number) {
  return Math.abs(value * 10 - Math.round(value * 10)) < Number.EPSILON * 10;
}

function hasHalfStepIncrement(value: number) {
  return Math.abs(value * 2 - Math.round(value * 2)) < Number.EPSILON * 10;
}

export function createConfigEditorState(config: AppConfig): AppConfigEditorState {
  return {
    name: config.name,
    description: config.description,
    currency: config.currency,
    games: {
      journey: {
        initialPrize: config.games.journey.initialPrize,
        minDice: config.games.journey.minDice,
        maxDice: config.games.journey.maxDice,
        maxPrize: config.games.journey.maxPrize,
        mapSize: config.games.journey.mapSize,
        jackpot: clone(config.games.journey.jackpot),
        cells: clone(config.games.journey.cells),
        achievements: clone(config.games.journey.achievements),
      },
      battleships: {
        selectedBoardSize: config.games.battleships.selectedBoardSize,
        boards: sortBoardDrafts(
          Object.values(config.games.battleships.boards).map((board) => ({
            boardSize: board.boardSize,
            ships: clone(board.ships),
            maxShots: board.maxShots,
            prizes: {
              shoot: board.prizes.shoot,
              destroyBonus: Object.entries(board.prizes.destroyBonus)
                .map(([size, bonus]) => ({
                  size: Number(size),
                  bonus,
                }))
                .sort((left, right) => left.size - right.size),
            },
          })),
        ),
      },
      lotto: clone(config.games.lotto),
    },
  };
}

export function createDuplicateConfigEditorState(config: AppConfig): AppConfigEditorState {
  const draft = createConfigEditorState(config);

  return {
    ...draft,
    name: `Копия ${config.name}`,
  };
}

export function buildConfigMutationPayload(draft: AppConfigEditorState): AppConfigMutationPayload {
  return {
    name: draft.name.trim(),
    description: draft.description,
    currency: draft.currency.trim(),
    games: {
      journey: clone(draft.games.journey),
      battleships: {
        selectedBoardSize: draft.games.battleships.selectedBoardSize,
        boards: Object.fromEntries(
          sortBoardDrafts(draft.games.battleships.boards).map((board) => [
            String(board.boardSize),
            {
              boardSize: board.boardSize,
              ships: clone(board.ships),
              maxShots: board.maxShots,
              prizes: {
                shoot: board.prizes.shoot,
                destroyBonus: Object.fromEntries(
                  board.prizes.destroyBonus.map((bonusItem) => [String(bonusItem.size), bonusItem.bonus]),
                ),
              },
            },
          ]),
        ),
      },
      lotto: clone(draft.games.lotto),
    },
  };
}

export function validateConfigEditorState(draft: AppConfigEditorState): string | null {
  if (!draft.name.trim()) {
    return "Укажите название проекта.";
  }

  if (!draft.currency.trim()) {
    return "Укажите валюту проекта.";
  }

  if (!draft.games.journey.cells.length) {
    return "Добавьте хотя бы одну клетку Journey.";
  }

  if (!draft.games.battleships.boards.length) {
    return "Добавьте хотя бы одно поле Battleships.";
  }

  const boardSizes = draft.games.battleships.boards.map((board) => board.boardSize);
  if (new Set(boardSizes).size !== boardSizes.length) {
    return "Размеры полей Battleships должны быть уникальными.";
  }

  if (!draft.games.battleships.boards.some((board) => board.boardSize === draft.games.battleships.selectedBoardSize)) {
    return "Выбранный размер поля Battleships должен совпадать с одним из полей.";
  }

  const invalidShootPrizeBoard = draft.games.battleships.boards.find(
    (board) => board.prizes.shoot < 0 || !hasAtMostOneDecimalPlace(board.prizes.shoot),
  );
  if (invalidShootPrizeBoard) {
    return "Приз за попадание в Battleships должен быть неотрицательным числом с одним знаком после точки.";
  }

  const invalidDestroyBonusBoard = draft.games.battleships.boards.find((board) =>
    board.prizes.destroyBonus.some((bonusItem) => bonusItem.bonus < 0 || !hasHalfStepIncrement(bonusItem.bonus)),
  );
  if (invalidDestroyBonusBoard) {
    return "Бонус за добивание в Battleships должен быть неотрицательным числом с шагом 0.5.";
  }

  return null;
}
