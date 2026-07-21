export type JourneyCellKind = "bonus" | "trap";
export type JourneyPlayerStatus = "active" | "finished" | "removed";
export type JourneyGameStatus = "in_progress" | "finished";
export interface JourneyCurrencyDefinition {
  id: string;
  label: string;
}

export interface JourneyCurrencyValue {
  currencyId: string;
  value: number;
}

export interface JourneyRulesCell {
  id: string;
  kind: JourneyCellKind;
  rewards: JourneyCurrencyValue[];
  count: number;
}

export type JourneyCollectorTargetKind = JourneyCellKind | "empty";

export interface JourneyCollectorTarget {
  id: string;
  kind: JourneyCollectorTargetKind;
  rewards: JourneyCurrencyValue[];
}

export interface JourneyRulesAchievementConfig {
  rewards: JourneyCurrencyValue[];
}

export interface JourneyRulesAchievements {
  unlucky: JourneyRulesAchievementConfig;
  careful: JourneyRulesAchievementConfig;
  collector: JourneyRulesAchievementConfig;
  lucky: JourneyRulesAchievementConfig;
}

export interface JourneyRules {
  initialRewards: JourneyCurrencyValue[];
  minDice: number;
  maxDice: number;
  maxPrizes: JourneyCurrencyValue[] | null;
  mapSize: number;
  jackpot: {
    count: number;
    rewards: JourneyCurrencyValue[];
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

export interface JourneyConfig {
  mapSize: number;
  finishPosition: number;
  initialRewards: JourneyCurrencyValue[];
  minDice: number;
  maxDice: number;
  maxPrizes: JourneyCurrencyValue[] | null;
  jackpotRewards: JourneyCurrencyValue[];
  currencies: JourneyCurrencyDefinition[];
}

export interface JourneyAchievement {
  name: string;
  title?: string;
  rewards: JourneyCurrencyValue[];
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
  id: string;
  kind: JourneyCellKind;
  rewards: JourneyCurrencyValue[];
  isJackpot?: boolean;
  winner?: JourneyMapCellWinner | null;
}

export interface JourneyPlayerReadModel {
  id: string;
  nickname: string;
  status: JourneyPlayerStatus;
  position: number;
  balanceEntries: JourneyCurrencyValue[];
  bonuses: JourneyAchievement[];
}

export interface JourneyTimelineEntry {
  createdAt: string;
  roundIndex: number | string;
  skipped: boolean;
  previousPosition: number | null;
  currentPosition: number | null;
  appliedRewards: JourneyCurrencyValue[];
  balanceAfterRound: JourneyCurrencyValue[] | null;
  cell: JourneyMapCell | null;
  achievementsAwarded: JourneyAchievement[];
}

export interface JourneyForumStateMessage {
  text: string;
  generatedAt: string;
}

/** The backend response contract. It does not expose persistence rounds or aliases. */
export interface JourneyGameView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    status: JourneyGameStatus;
    isOver: boolean;
    roundIndex: number;
    djName: string;
    projectId: string;
    configId: string;
    configName: string;
    forumTopicId: number | null;
  };
  configuration: {
    currencies: JourneyCurrencyDefinition[];
    rules: JourneyRules;
    journeyConfig: JourneyConfig;
    achievements: JourneyAchievementsMap;
    collectorTargets: JourneyCollectorTarget[];
  };
  state: {
    board: Record<number, JourneyMapCell>;
    players: JourneyPlayerReadModel[];
    activePlayerIds: string[];
    finishedPlayerIds: string[];
    visiblePlayerIds: string[];
    resultPlayerIds: string[];
  };
  achievements: {
    progressByPlayerId: Record<string, JourneyAchievementProgress>;
  };
  history: {
    byPlayerId: Record<string, JourneyTimelineEntry[]>;
  };
  forumLog: string[];
}

/**
 * Feature-local composition model. It is produced by a structural API mapper;
 * no game decision is made on the client.
 */
export interface JourneyPageGame {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: JourneyGameStatus;
  gameIsOver: boolean;
  roundsCount: number;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  forumTopicId: number | null;
  currencies: JourneyCurrencyDefinition[];
  rules: JourneyRules;
  map: Record<number, JourneyMapCell>;
  players: JourneyPlayerReadModel[];
  activePlayers: JourneyPlayerReadModel[];
  finishedPlayers: JourneyPlayerReadModel[];
  visiblePlayers: JourneyPlayerReadModel[];
  results: JourneyPlayerReadModel[];
  journeyConfig: JourneyConfig;
  journeyAchievements: JourneyAchievementsMap;
  collectorTargets: JourneyCollectorTarget[];
  achievementProgressByPlayerId: Record<string, JourneyAchievementProgress>;
  playerTimelines: Record<string, JourneyTimelineEntry[]>;
  forumLog: string[];
}

export interface JourneySavedGamePlayer {
  id: string;
  nickname: string;
  status: JourneyPlayerStatus;
  position: number;
  balanceEntries: JourneyCurrencyValue[];
}

export interface JourneySavedGameSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: JourneyGameStatus;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  currencies: JourneyCurrencyDefinition[];
  roundsCount: number;
  players: JourneySavedGamePlayer[];
}

export type JourneyMoveInputs = Record<string, string>;
export type JourneySkippedPlayers = Record<string, boolean>;

export interface JourneyMoveInput {
  playerId: string;
  dice: number;
}

export interface JourneyForumMoveCandidate {
  playerId: string;
  playerNickname: string;
  dice: number;
  sourceMessage: {
    id: string;
    authorId: string;
    authorLogin: string;
    text: string;
    publishedAt: string;
  };
}

export interface JourneyForumMovesPreview {
  topicId: number;
  provider: string;
  nextRoundIndex: number;
  boundary: {
    kind: "game_started" | "round";
    roundIndex: number | null;
    messageId: string;
    publishedAt: string;
  };
  moves: JourneyForumMoveCandidate[];
  ignoredMessages: Array<{
    id: string;
    authorLogin: string;
    text: string;
    reason: "player_not_active" | "dice_not_found" | "dice_out_of_range";
  }>;
}

export type JourneyChipColor = "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning";

export interface JourneyStatusChip {
  label: string;
  color?: JourneyChipColor;
}

export interface HoveredCellState {
  anchorEl: HTMLElement;
  cellIndex: number;
  cell: JourneyMapCell | null;
  playersOnCell: JourneyPlayerReadModel[];
}

export interface JourneyCollectorProgress {
  achieved: boolean;
  obtainedCellIds: string[];
  missingCellIds: string[];
}

export interface JourneyStreakProgress {
  achieved: boolean;
  current: number;
  best: number;
  target: number;
}

export interface JourneyAchievementProgress {
  collector: JourneyCollectorProgress;
  unlucky: JourneyStreakProgress;
  careful: JourneyStreakProgress;
  lucky: JourneyStreakProgress;
}
