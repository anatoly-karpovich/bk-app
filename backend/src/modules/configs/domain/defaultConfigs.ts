import { normalizeJourneyRules } from "../../journey/domain/config";
import type { AppConfig } from "./types";

export const DEFAULT_APP_CONFIGS: AppConfig[] = [
  {
    id: "oldbk2",
    name: "oldbk2",
    description: "Базовые правила Карты Мародёров",
    games: {
      journey: normalizeJourneyRules({
        currency: "фишек",
        initialPrize: 15,
        minDice: 1,
        maxDice: 5,
        maxPrize: 30,
        mapSize: 50,
        jackpot: {
          count: 7,
          prize: 30,
        },
        cells: [
          { id: "bonus_2", kind: "bonus", value: 2, count: 12 },
          { id: "bonus_3", kind: "bonus", value: 3, count: 5 },
          { id: "bonus_5", kind: "bonus", value: 5, count: 2 },
          { id: "trap_3", kind: "trap", value: -3, count: 2 },
          { id: "trap_2", kind: "trap", value: -2, count: 4 },
          { id: "trap_1", kind: "trap", value: -1, count: 4 },
        ],
        achievements: {
          unlucky: { prize: 5 },
          careful: { prize: 5 },
          collector: { prize: 5 },
          lucky: { prize: 5 },
        },
      }),
    },
  },
  {
    id: "combatsclub",
    name: "Combats Club",
    description: "Правила Карты Мародёров для проекта Combats Club",
    games: {
      journey: normalizeJourneyRules({
        currency: "екр",
        initialPrize: 30,
        minDice: 1,
        maxDice: 5,
        maxPrize: null,
        mapSize: 50,
        jackpot: {
          count: 7,
          prize: 30,
        },
        cells: [
          { id: "bonus_2", kind: "bonus", value: 2, count: 12 },
          { id: "bonus_3", kind: "bonus", value: 3, count: 5 },
          { id: "bonus_5", kind: "bonus", value: 5, count: 2 },
          { id: "trap_3", kind: "trap", value: -3, count: 2 },
          { id: "trap_2", kind: "trap", value: -2, count: 4 },
          { id: "trap_1", kind: "trap", value: -1, count: 4 },
        ],
        achievements: {
          unlucky: { prize: 10 },
          careful: { prize: 10 },
          collector: { prize: 12 },
          lucky: { prize: 15 },
        },
      }),
    },
  },
];
