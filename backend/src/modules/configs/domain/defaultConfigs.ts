import { normalizeBattleshipsRules } from "../../battleships/domain/config";
import { normalizeJourneyRules } from "../../journey/domain/config";
import { normalizeLottoRules } from "../../lotto/domain/config";
import type { AppConfigSeed } from "./types";

export const DEFAULT_APP_CONFIGS: AppConfigSeed[] = [
  {
    name: "oldbk2",
    description: "Базовые правила Карты Мародёров",
    currencies: [
      {
        id: "default",
        label: "фишек",
      },
    ],
    games: {
      battleships: normalizeBattleshipsRules({
        selectedBoardSize: 6,
        boards: {
          6: {
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
          },
        },
      }),
      lotto: normalizeLottoRules({
        min: 1,
        max: 50,
        cardNumbersAmount: 10,
        firstPlacePrize: [{ currencyId: "default", value: 10 }],
        secondPlacePrize: [{ currencyId: "default", value: 5 }],
        otherActivePlayersPrize: [{ currencyId: "default", value: 0 }],
        rewardDistributionMode: "full_per_winner",
      }),
      journey: normalizeJourneyRules({
        initialRewards: [{ currencyId: "default", value: 15 }],
        minDice: 1,
        maxDice: 5,
        maxPrizes: [{ currencyId: "default", value: 30 }],
        mapSize: 50,
        jackpot: {
          count: 7,
          rewards: [{ currencyId: "default", value: 30 }],
        },
        cells: [
          { id: "bonus_2", kind: "bonus", rewards: [{ currencyId: "default", value: 2 }], count: 12 },
          { id: "bonus_3", kind: "bonus", rewards: [{ currencyId: "default", value: 3 }], count: 5 },
          { id: "bonus_5", kind: "bonus", rewards: [{ currencyId: "default", value: 5 }], count: 2 },
          { id: "trap_3", kind: "trap", rewards: [{ currencyId: "default", value: -3 }], count: 2 },
          { id: "trap_2", kind: "trap", rewards: [{ currencyId: "default", value: -2 }], count: 4 },
          { id: "trap_1", kind: "trap", rewards: [{ currencyId: "default", value: -1 }], count: 4 },
        ],
        achievements: {
          unlucky: { rewards: [{ currencyId: "default", value: 5 }] },
          careful: { rewards: [{ currencyId: "default", value: 5 }] },
          collector: { rewards: [{ currencyId: "default", value: 5 }] },
          lucky: { rewards: [{ currencyId: "default", value: 5 }] },
        },
      }),
    },
  },
  {
    name: "Combats Club",
    description: "Правила Карты Мародёров для проекта Combats Club",
    currencies: [
      {
        id: "default",
        label: "екр",
      },
    ],
    games: {
      battleships: normalizeBattleshipsRules({
        selectedBoardSize: 6,
        boards: {
          6: {
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
          },
        },
      }),
      lotto: normalizeLottoRules({
        min: 1,
        max: 50,
        cardNumbersAmount: 10,
        firstPlacePrize: [{ currencyId: "default", value: 10 }],
        secondPlacePrize: [{ currencyId: "default", value: 5 }],
        otherActivePlayersPrize: [{ currencyId: "default", value: 0 }],
        rewardDistributionMode: "full_per_winner",
      }),
      journey: normalizeJourneyRules({
        initialRewards: [{ currencyId: "default", value: 30 }],
        minDice: 1,
        maxDice: 5,
        maxPrizes: null,
        mapSize: 50,
        jackpot: {
          count: 7,
          rewards: [{ currencyId: "default", value: 30 }],
        },
        cells: [
          { id: "bonus_2", kind: "bonus", rewards: [{ currencyId: "default", value: 2 }], count: 12 },
          { id: "bonus_3", kind: "bonus", rewards: [{ currencyId: "default", value: 3 }], count: 5 },
          { id: "bonus_5", kind: "bonus", rewards: [{ currencyId: "default", value: 5 }], count: 2 },
          { id: "trap_3", kind: "trap", rewards: [{ currencyId: "default", value: -3 }], count: 2 },
          { id: "trap_2", kind: "trap", rewards: [{ currencyId: "default", value: -2 }], count: 4 },
          { id: "trap_1", kind: "trap", rewards: [{ currencyId: "default", value: -1 }], count: 4 },
        ],
        achievements: {
          unlucky: { rewards: [{ currencyId: "default", value: 10 }] },
          careful: { rewards: [{ currencyId: "default", value: 10 }] },
          collector: { rewards: [{ currencyId: "default", value: 12 }] },
          lucky: { rewards: [{ currencyId: "default", value: 15 }] },
        },
      }),
    },
  },
];
