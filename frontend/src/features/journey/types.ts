export type JourneyCellKind = "bonus" | "trap";
export type JourneyPlayerStatus = "active" | "finished" | "removed";
export type JourneyGameStatus = "in_progress" | "finished";
export type JourneyJackpotCountMode = "fixed" | "by_players";

export interface JourneyResourceDefinition {
  id: string;
  type: "currency" | "item";
  code: string;
  name: string;
  label: string;
  valueType?: "integer" | "decimal";
  precision?: number;
}

import type { ResourceAmount, RewardPool as SharedRewardPool } from "../rewards/types";
export type JourneyResourceAmount = ResourceAmount;
export type RewardPool = SharedRewardPool;

export interface ResourceLimit {
  resourceId: string;
  min?: number;
  max?: number;
}

export interface JourneyRulesCell {
  id: string;
  kind: JourneyCellKind;
  mapLabel: string;
  rewardPool: RewardPool;
  count: number;
}

export interface JourneyRules {
  initialRewardPool: RewardPool;
  minDice: number;
  maxDice: number;
  resourceLimits: ResourceLimit[];
  mapSize: number;
  jackpot: {
    countMode: JourneyJackpotCountMode;
    count: number;
    playersPerJackpot: number;
    rewardPool: RewardPool;
  };
  cells: JourneyRulesCell[];
  achievements: Record<"unlucky" | "careful" | "collector" | "lucky", { rewardPool: RewardPool }>;
}

export type JourneyRulesInput = Partial<JourneyRules>;

export interface JourneyConfig {
  mapSize: number;
  finishPosition: number;
  initialRewardPool: RewardPool;
  minDice: number;
  maxDice: number;
  resourceLimits: ResourceLimit[];
  jackpotRewardPool: RewardPool;
  resources: JourneyResourceDefinition[];
}

export interface JourneyAchievement {
  name: string;
  title?: string;
  rewardPool: RewardPool;
  description?: string;
}

export interface JourneyAwardedBonus {
  name: string;
  title?: string;
  description?: string;
  source: "achievement" | "jackpot";
  appliedRewards: JourneyResourceAmount[];
}

export type JourneyAchievementsMap = Record<"JACKPOT" | "UNLUCKY" | "CAREFUL" | "COLLECTOR" | "LUCKY", JourneyAchievement>;

export interface JourneyMapCell {
  id: string;
  kind: JourneyCellKind;
  mapLabel?: string;
  rewardPool: RewardPool;
  isJackpot?: boolean;
  winner?: { nickname: string } | null;
}

export interface JourneyPlayerReadModel {
  id: string;
  nickname: string;
  status: JourneyPlayerStatus;
  position: number;
  baseRewardEntries: JourneyResourceAmount[];
  bonusRewardEntries: JourneyResourceAmount[];
  balanceEntries: JourneyResourceAmount[];
  bonuses: JourneyAwardedBonus[];
}

export interface JourneyTimelineEntry {
  createdAt: string;
  roundIndex: number | string;
  skipped: boolean;
  previousPosition: number | null;
  currentPosition: number | null;
  requestedRewards: JourneyResourceAmount[];
  resolvedRewards: JourneyResourceAmount[];
  appliedRewards: JourneyResourceAmount[];
  balanceAfterRound: JourneyResourceAmount[] | null;
  cell: JourneyMapCell | null;
  achievementsAwarded: JourneyAchievement[];
}

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
    hostUserId?: string;
    hostSnapshot?: { userId: string; displayName: string; nickname: string };
  };
  configuration: { resources: JourneyResourceDefinition[]; rules: JourneyRules; journeyConfig: JourneyConfig; achievements: JourneyAchievementsMap; collectorTargets: JourneyCollectorTarget[] };
  state: { board: Record<number, JourneyMapCell>; players: JourneyPlayerReadModel[]; activePlayerIds: string[]; finishedPlayerIds: string[]; visiblePlayerIds: string[]; resultPlayerIds: string[] };
  achievements: { progressByPlayerId: Record<string, JourneyAchievementProgress> };
  history: { byPlayerId: Record<string, JourneyTimelineEntry[]> };
  forumLog: string[];
}

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
  resources: JourneyResourceDefinition[];
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

export interface JourneySavedGamePlayer extends JourneyPlayerReadModel {}

export interface JourneySavedGameSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: JourneyGameStatus;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  resources: JourneyResourceDefinition[];
  roundsCount: number;
  players: JourneySavedGamePlayer[];
}

export interface JourneyMoveInput { playerId: string; dice: number; }
export interface JourneyForumStateMessage { text: string; generatedAt: string; }
export interface JourneyAchievementProgress {
  collector: { achieved: boolean; obtainedCellKeys: string[]; missingCellKeys: string[] };
  unlucky: { achieved: boolean; current: number; best: number; target: number };
  careful: { achieved: boolean; current: number; best: number; target: number };
  lucky: { achieved: boolean; current: number; best: number; target: number };
}
export interface JourneyCollectorTarget { key: string; id: string; kind: JourneyCellKind | "empty"; mapLabel: string; rewardPool: RewardPool | null; }
export interface JourneyStatusChip { label: string; color?: "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning"; }
export type JourneyMoveInputs = Record<string, string>;
export type JourneySkippedPlayers = Record<string, boolean>;
export interface HoveredCellState { anchorEl: HTMLElement; cellIndex: number; cell: JourneyMapCell | null; playersOnCell: JourneyPlayerReadModel[]; }
export interface JourneyForumMovesPreview { topicId: number; provider: string; nextRoundIndex: number; boundary: { kind: "game_started" | "round"; roundIndex: number | null; messageId: string; publishedAt: string }; moves: Array<{ playerId: string; playerNickname: string; dice: number; sourceMessage: { id: string; authorId: string; authorLogin: string; text: string; publishedAt: string } }>; ignoredMessages: Array<{ id: string; authorLogin: string; text: string; reason: "player_not_active" | "dice_not_found" | "dice_out_of_range" }>; }
