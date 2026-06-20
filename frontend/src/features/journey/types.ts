export type RandomFn = () => number;

export type JourneyCellKind = "bonus" | "trap";
export type JourneyPlayerStatus = "active" | "finished" | "removed";
export type JourneyGameStatus = "in_progress" | "finished";
export type JourneySkippedMoveType = "skipped";
export type JourneyMoveType =
  | "moveWithJackpot"
  | "moveWithEmptyJackpot"
  | "moveWithIncreasingPrize"
  | "moveWithDecreasingPrize"
  | "moveWithoutBonus"
  | "moveToFinish"
  | "moveWithMaxPrize"
  | "moveToMaxPrize"
  | "moveToZeroPrize"
  | "moveWithZeroPrize"
  | "moveToAchievement";

export interface JourneyRulesCell {
  id: string;
  kind: JourneyCellKind;
  value: number;
  count: number;
}

export interface JourneyRulesAchievementConfig {
  prize: number;
}

export interface JourneyRulesAchievements {
  unlucky: JourneyRulesAchievementConfig;
  careful: JourneyRulesAchievementConfig;
  collector: JourneyRulesAchievementConfig;
  lucky: JourneyRulesAchievementConfig;
}

export interface JourneyRules {
  currency: string;
  initialPrize: number;
  minDice: number;
  maxDice: number;
  maxPrize: number | null;
  mapSize: number;
  jackpot: {
    count: number;
    prize: number;
  };
  cells: JourneyRulesCell[];
  achievements: JourneyRulesAchievements;
}

export type JourneyRulesInput = Omit<Partial<JourneyRules>, "jackpot" | "achievements" | "cells"> & {
  jackpot?: Partial<JourneyRules["jackpot"]>;
  achievements?: {
    unlucky?: Partial<JourneyRulesAchievementConfig>;
    careful?: Partial<JourneyRulesAchievementConfig>;
    collector?: Partial<JourneyRulesAchievementConfig>;
    lucky?: Partial<JourneyRulesAchievementConfig>;
  };
  cells?: JourneyRulesCell[];
};

export interface JourneyRuleset {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  rules: JourneyRules;
}

export type JourneyRulesetInput = Omit<Partial<JourneyRuleset>, "rules"> & {
  rules?: JourneyRulesInput;
};

export interface JourneyConfig {
  mapSize: number;
  finishPosition: number;
  initialPrize: number;
  minDice: number;
  maxDice: number;
  maxPrize: number | null;
  jackpotPrize: number;
  currency: string;
}

export interface JourneyAchievement {
  name: string;
  title?: string;
  prize: number;
  description?: string;
}

export interface JourneyAchievementsMap {
  JACKPOT: JourneyAchievement;
  UNLUCKY: JourneyAchievement;
  CAREFUL: JourneyAchievement;
  COLLECTOR: JourneyAchievement;
  LUCKY: JourneyAchievement;
}

export interface JourneyMapCellWinner {
  nickname: string;
}

export interface JourneyMapCell {
  prize: number;
  isJackpot?: boolean;
  winner?: JourneyMapCellWinner | null;
}

export interface JourneyPlayerMoveHistoryEntry {
  position: number;
  cell: JourneyMapCell | null;
  type: JourneyMoveType;
}

export interface JourneyPlayer {
  id: string;
  nickname: string;
  status: JourneyPlayerStatus;
  removedAt: string | null;
  removedReason: string | null;
  position: number;
  previousPosition: number;
  previousPrize: number;
  prize: number;
  bonuses: JourneyAchievement[];
  movesHistory: JourneyPlayerMoveHistoryEntry[];
}

export interface JourneyMove {
  playerNickname: string;
  dice: number;
  previousPosition: number;
  previousPrize: number;
  currentPosition: number;
  prize: number;
  cell: JourneyMapCell | null;
  type: JourneyMoveType;
}

export interface JourneyAchievementMove {
  type: "moveToAchievement";
  playerNickname: string;
  achievement: JourneyAchievement;
}

export interface JourneyRoundEntry {
  createdAt: string;
  playerId: string | null;
  nickname: string;
  playerStatusBeforeRound: JourneyPlayerStatus | null;
  playerStatusAfterRound: JourneyPlayerStatus | null;
  skipped: boolean;
  dice: number | null;
  previousPosition: number | null;
  currentPosition: number | null;
  previousPrize: number | null;
  prizeAfterMove: number | null;
  fullPrizeAfterRound: number | null;
  moveType: JourneyMoveType | JourneySkippedMoveType | null;
  cell: JourneyMapCell | null;
  achievementsAwarded: JourneyAchievement[];
  bonusesSnapshot: JourneyAchievement[];
}

export interface JourneyRound {
  createdAt: string;
  moveIndex: number;
  entries: JourneyRoundEntry[];
  movesByNickname?: Record<string, JourneyMove>;
  skippedNicknames?: string[];
  achievementMoves?: JourneyAchievementMove[];
}

export interface JourneyGame {
  createdAt: string;
  updatedAt: string;
  moveIndex: number;
  status: JourneyGameStatus;
  rulesetId: string;
  rulesetName: string;
  rules: JourneyRules;
  map: Record<number, JourneyMapCell>;
  players: JourneyPlayer[];
  playersById: Record<string, JourneyPlayer>;
  rounds: JourneyRound[];
  comments: string[];
}

export interface JourneyRulesetState {
  rulesets: JourneyRuleset[];
  defaultRulesetId: string;
}

export type JourneyMoveInputs = Record<string, string>;
export type JourneySkippedPlayers = Record<string, boolean>;
export type JourneyPlayersById = Record<string, JourneyPlayer>;
export type JourneyMovesByNickname = Record<string, JourneyMove>;
export type JourneyAchievementsByNickname = Record<string, JourneyAchievement[]>;
export type JourneyParsedMoves = Record<string, number>;
export type JourneyReceiptsDistribution = Record<number, number>;

export interface JourneyTimelineEntry extends JourneyRoundEntry {
  roundIndex: number | string;
}

export interface JourneyMoveInput {
  nickname: string;
  dice: number;
}
