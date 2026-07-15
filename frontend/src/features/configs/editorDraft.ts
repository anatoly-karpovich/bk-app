import type { CurrencyValue } from "../../lib/currencyValues";
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

function hasMixedSigns(values: Array<{ value: number }>) {
  const hasPositive = values.some((value) => value.value > 0);
  const hasNegative = values.some((value) => value.value < 0);
  return hasPositive && hasNegative;
}

function validateRewardSet(params: {
  rewards: CurrencyValue[];
  currencyIds: string[];
  label: string;
  allowNegative: boolean;
  valueValidator?: (value: number) => boolean;
  invalidValueMessage?: string;
}): string | null {
  const { rewards, currencyIds, label, allowNegative, valueValidator, invalidValueMessage } = params;

  if (!rewards.length) {
    return `${label} должен содержать хотя бы одну валюту.`;
  }

  if (rewards.some((reward) => !reward.currencyId.trim())) {
    return `${label}: у каждой награды должен быть указан currencyId.`;
  }

  if (rewards.some((reward) => !currencyIds.includes(reward.currencyId.trim()))) {
    return `${label}: используются валюты вне общего пула проекта.`;
  }

  if (new Set(rewards.map((reward) => reward.currencyId.trim())).size !== rewards.length) {
    return `${label}: валюты не должны повторяться внутри одного набора наград.`;
  }

  if (hasMixedSigns(rewards)) {
    return `${label}: нельзя смешивать положительные и отрицательные награды.`;
  }

  if (!allowNegative && rewards.some((reward) => reward.value < 0)) {
    return `${label}: здесь допустимы только неотрицательные награды.`;
  }

  if (rewards.every((reward) => reward.value === 0)) {
    return `${label}: хотя бы одна награда должна быть ненулевой.`;
  }

  if (valueValidator && rewards.some((reward) => !valueValidator(reward.value))) {
    return `${label}: ${invalidValueMessage ?? "некорректное значение награды."}`;
  }

  return null;
}

export function createConfigEditorState(config: AppConfig): AppConfigEditorState {
  return {
    name: config.name,
    description: config.description,
    currencies: clone(config.currencies),
    games: {
      journey: {
        initialRewards: clone(config.games.journey.initialRewards),
        minDice: config.games.journey.minDice,
        maxDice: config.games.journey.maxDice,
        maxPrizes: clone(config.games.journey.maxPrizes),
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
              shoot: clone(board.prizes.shoot),
              destroyBonus: Object.entries(board.prizes.destroyBonus)
                .map(([size, rewards]) => ({
                  size: Number(size),
                  rewards: clone(rewards),
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
    currencies: draft.currencies.map((currency) => ({
      id: currency.id.trim(),
      label: currency.label.trim(),
    })),
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
                shoot: clone(board.prizes.shoot),
                destroyBonus: Object.fromEntries(
                  board.prizes.destroyBonus.map((bonusItem) => [String(bonusItem.size), clone(bonusItem.rewards)]),
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

  if (!draft.currencies.length) {
    return "Добавьте хотя бы одну валюту проекта.";
  }

  if (draft.currencies.some((currency) => !currency.id.trim())) {
    return "У каждой валюты должен быть заполнен ID.";
  }

  if (draft.currencies.some((currency) => !currency.label.trim())) {
    return "У каждой валюты должно быть заполнено название.";
  }

  const currencyIds = draft.currencies.map((currency) => currency.id.trim());
  if (new Set(currencyIds).size !== currencyIds.length) {
    return "ID валют должны быть уникальными.";
  }

  const initialRewardsError = validateRewardSet({
    rewards: draft.games.journey.initialRewards,
    currencyIds,
    label: "Стартовый баланс Journey",
    allowNegative: false,
    valueValidator: Number.isInteger,
    invalidValueMessage: "значения должны быть целыми.",
  });
  if (initialRewardsError) {
    return initialRewardsError;
  }

  if (draft.games.journey.maxPrizes) {
    const maxPrizesError = validateRewardSet({
      rewards: draft.games.journey.maxPrizes,
      currencyIds,
      label: "Лимит баланса Journey",
      allowNegative: false,
      valueValidator: Number.isInteger,
      invalidValueMessage: "значения должны быть целыми.",
    });
    if (maxPrizesError) {
      return maxPrizesError;
    }
  }

  const jackpotRewardsError = validateRewardSet({
    rewards: draft.games.journey.jackpot.rewards,
    currencyIds,
    label: "Награда сокровища Journey",
    allowNegative: false,
    valueValidator: Number.isInteger,
    invalidValueMessage: "значения должны быть целыми.",
  });
  if (jackpotRewardsError) {
    return jackpotRewardsError;
  }

  if (!draft.games.journey.cells.length) {
    return "Добавьте хотя бы одну клетку Journey.";
  }

  for (const cell of draft.games.journey.cells) {
    const cellRewardsError = validateRewardSet({
      rewards: cell.rewards,
      currencyIds,
      label: `Клетка Journey "${cell.id}"`,
      allowNegative: true,
      valueValidator: Number.isInteger,
      invalidValueMessage: "значения должны быть целыми.",
    });
    if (cellRewardsError) {
      return cellRewardsError;
    }

    if (cell.kind === "bonus" && cell.rewards.some((reward) => reward.value < 0)) {
      return `Клетка Journey "${cell.id}": бонусная клетка не может иметь отрицательные награды.`;
    }

    if (cell.kind === "trap" && cell.rewards.some((reward) => reward.value > 0)) {
      return `Клетка Journey "${cell.id}": ловушка не может иметь положительные награды.`;
    }
  }

  for (const [key, achievement] of Object.entries(draft.games.journey.achievements)) {
    const achievementRewardsError = validateRewardSet({
      rewards: achievement.rewards,
      currencyIds,
      label: `Достижение Journey "${key}"`,
      allowNegative: false,
      valueValidator: Number.isInteger,
      invalidValueMessage: "значения должны быть целыми.",
    });
    if (achievementRewardsError) {
      return achievementRewardsError;
    }
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

  for (const board of draft.games.battleships.boards) {
    const shootRewardsError = validateRewardSet({
      rewards: board.prizes.shoot,
      currencyIds,
      label: `Попадание Battleships ${board.boardSize}x${board.boardSize}`,
      allowNegative: false,
      valueValidator: (value) => value >= 0 && hasAtMostOneDecimalPlace(value),
      invalidValueMessage: "значения должны быть неотрицательными и не точнее 0.1.",
    });
    if (shootRewardsError) {
      return shootRewardsError;
    }

    for (const bonusItem of board.prizes.destroyBonus) {
      const destroyRewardsError = validateRewardSet({
        rewards: bonusItem.rewards,
        currencyIds,
        label: `Добивание Battleships ${board.boardSize}x${board.boardSize} для корабля ${bonusItem.size}`,
        allowNegative: false,
        valueValidator: (value) => value >= 0 && hasHalfStepIncrement(value),
        invalidValueMessage: "значения должны быть неотрицательными и кратными 0.5.",
      });
      if (destroyRewardsError) {
        return destroyRewardsError;
      }
    }
  }

  const firstPlacePrizeError = validateRewardSet({
    rewards: draft.games.lotto.firstPlacePrize,
    currencyIds,
    label: "Приз Lotto за 1 место",
    allowNegative: false,
    valueValidator: Number.isInteger,
    invalidValueMessage: "значения должны быть целыми.",
  });
  if (firstPlacePrizeError) {
    return firstPlacePrizeError;
  }

  const secondPlacePrizeError = validateRewardSet({
    rewards: draft.games.lotto.secondPlacePrize,
    currencyIds,
    label: "Приз Lotto за 2 место",
    allowNegative: false,
    valueValidator: Number.isInteger,
    invalidValueMessage: "значения должны быть целыми.",
  });
  if (secondPlacePrizeError) {
    return secondPlacePrizeError;
  }

  const otherPrizeError = validateRewardSet({
    rewards: draft.games.lotto.otherActivePlayersPrize,
    currencyIds,
    label: "Приз Lotto остальным игрокам",
    allowNegative: false,
    valueValidator: Number.isInteger,
    invalidValueMessage: "значения должны быть целыми.",
  });
  if (otherPrizeError) {
    return otherPrizeError;
  }

  return null;
}
