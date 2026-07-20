import type { CurrencySnapshot } from "../../../common/currency";

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

export interface JourneyCurrencyValue {
  currencyId: string;
  value: number;
}

export type JourneyBalance = Record<string, number>;

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
  currencies: CurrencySnapshot[];
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
  previousBalance: JourneyBalance;
  balance: JourneyBalance;
  bonuses: JourneyAchievement[];
  movesHistory: JourneyPlayerMoveHistoryEntry[];
}

export interface JourneyMove {
  playerId: string;
  playerNickname: string;
  dice: number;
  previousPosition: number;
  previousBalance: JourneyBalance;
  currentPosition: number;
  balanceAfterMove: JourneyBalance;
  requestedRewards: JourneyCurrencyValue[];
  appliedRewards: JourneyCurrencyValue[];
  cell: JourneyMapCell | null;
  type: JourneyMoveType;
}

export interface JourneyAchievementMove {
  type: "moveToAchievement";
  playerId: string;
  playerNickname: string;
  achievement: JourneyAchievement;
  appliedRewards: JourneyCurrencyValue[];
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
  previousBalance: JourneyCurrencyValue[] | null;
  appliedRewards: JourneyCurrencyValue[];
  balanceAfterMove: JourneyCurrencyValue[] | null;
  balanceAfterRound: JourneyCurrencyValue[] | null;
  moveType: JourneyMoveType | JourneySkippedMoveType | null;
  cell: JourneyMapCell | null;
  achievementsAwarded: JourneyAchievement[];
  bonusesSnapshot: JourneyAchievement[];
}

export interface JourneyRound {
  createdAt: string;
  moveIndex: number;
  entries: JourneyRoundEntry[];
  movesByPlayerId?: Record<string, JourneyMove>;
  movesByNickname?: Record<string, JourneyMove>;
  skippedPlayerIds?: string[];
  skippedNicknames?: string[];
  achievementMoves?: JourneyAchievementMove[];
}

export interface JourneyGame {
  createdAt: string;
  updatedAt: string;
  moveIndex: number;
  status: JourneyGameStatus;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  currencies: CurrencySnapshot[];
  rules: JourneyRules;
  map: Record<number, JourneyMapCell>;
  players: JourneyPlayer[];
  playersById: Record<string, JourneyPlayer>;
  rounds: JourneyRound[];
  comments: string[];
}

export interface JourneyV2Player {
  id: string;
  nickname: string;
  status: JourneyPlayerStatus;
  removedAt: string | null;
  removedReason: string | null;
  position: number;
  balance: JourneyBalance;
  achievementNames: string[];
}

export interface JourneyV2AchievementEffect {
  name: string;
  appliedRewards: JourneyCurrencyValue[];
}

export type JourneyV2Turn =
  | {
      kind: "move";
      playerId: string;
      dice: number;
      from: number;
      to: number;
      moveType: JourneyMoveType;
      appliedRewards: JourneyCurrencyValue[];
      achievementEffects: JourneyV2AchievementEffect[];
    }
  | {
      kind: "skip";
      playerId: string;
    };

export interface JourneyV2Round {
  index: number;
  occurredAt: string;
  turns: JourneyV2Turn[];
}

export interface JourneyV2State {
  moveIndex: number;
  status: JourneyGameStatus;
  map: Record<number, JourneyMapCell>;
  players: JourneyV2Player[];
  rounds: JourneyV2Round[];
  forumLog: string[];
}

export interface JourneyV2Game {
  storageFormat: "v2";
  createdAt: string;
  updatedAt: string;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  currencies: CurrencySnapshot[];
  rules: JourneyRules;
  stateV2: JourneyV2State;
}

export interface JourneyPlayerReadModel extends JourneyPlayer {
  balanceEntries: JourneyCurrencyValue[];
}

/**
 * Public player projection. It intentionally omits persistence-only fields
 * such as previousBalance and movesHistory.
 */
export interface JourneyGameViewPlayer {
  id: string;
  nickname: string;
  status: JourneyPlayerStatus;
  position: number;
  balanceEntries: JourneyCurrencyValue[];
  bonuses: JourneyAchievement[];
}

/**
 * A rendered player-history event, not a persisted JourneyRoundEntry.
 */
export interface JourneyHistoryEntryView {
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

/**
 * The only full-game response contract used by Journey clients.
 *
 * Storage formats are deliberately not exposed: V1 and V2 documents are
 * projected to this same model. The response contains a current state, a
 * concise history view, and backend-prepared presentation data — never raw
 * persistence aliases or duplicated round snapshots.
 */
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
  };
  configuration: {
    currencies: CurrencySnapshot[];
    rules: JourneyRules;
    journeyConfig: JourneyConfig;
    achievements: JourneyAchievementsMap;
    collectorTargets: JourneyCollectorTarget[];
  };
  state: {
    board: Record<number, JourneyMapCell>;
    players: JourneyGameViewPlayer[];
    activePlayerIds: string[];
    finishedPlayerIds: string[];
    visiblePlayerIds: string[];
    resultPlayerIds: string[];
  };
  achievements: {
    progressByPlayerId: Record<string, JourneyAchievementProgress>;
  };
  history: {
    byPlayerId: Record<string, JourneyHistoryEntryView[]>;
  };
  forumLog: string[];
}

export interface JourneyGameDerivedData {
  journeyConfig: JourneyConfig;
  journeyAchievements: JourneyAchievementsMap;
  collectorTargets: JourneyCollectorTarget[];
  achievementProgressByPlayerId: Record<string, JourneyAchievementProgress>;
  gameIsOver: boolean;
  activePlayers: JourneyPlayerReadModel[];
  finishedPlayers: JourneyPlayerReadModel[];
  visiblePlayers: JourneyPlayerReadModel[];
  results: JourneyPlayerReadModel[];
  playerTimelines: Record<string, JourneyTimelineEntry[]>;
}

export type JourneyGameReadModel = Omit<JourneyGame, "playersById"> & {
  id: string;
  derived: JourneyGameDerivedData;
};

export interface JourneyGameListItemPlayerReadModel {
  id: string;
  nickname: string;
  status: JourneyPlayerStatus;
  position: number;
  balanceEntries: JourneyCurrencyValue[];
}

export interface JourneyGameListItemReadModel {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: JourneyGameStatus;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  currencies: CurrencySnapshot[];
  roundsCount: number;
  players: JourneyGameListItemPlayerReadModel[];
}

export interface JourneyPlayerDto {
  id: string;
  nickname: string;
  status: JourneyPlayerStatus;
  position: number;
  balanceEntries: JourneyCurrencyValue[];
  bonuses: JourneyAchievement[];
}

export interface JourneyRoundEntryDto {
  createdAt: string;
  playerId: string | null;
  skipped: boolean;
  previousPosition: number | null;
  currentPosition: number | null;
  previousBalance: JourneyCurrencyValue[] | null;
  appliedRewards: JourneyCurrencyValue[];
  balanceAfterMove: JourneyCurrencyValue[] | null;
  balanceAfterRound: JourneyCurrencyValue[] | null;
  moveType: JourneyMoveType | JourneySkippedMoveType | null;
  cell: JourneyMapCell | null;
  achievementsAwarded: JourneyAchievement[];
}

export interface JourneyRoundDto {
  createdAt: string;
  moveIndex: number;
  entries: JourneyRoundEntryDto[];
}

export interface JourneyGameDto {
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  currencies: CurrencySnapshot[];
  rules: JourneyRules;
  map: Record<number, JourneyMapCell>;
  players: JourneyPlayerDto[];
  rounds: JourneyRoundDto[];
  comments: string[];
}

export type JourneyMoveInputs = Record<string, string>;
export type JourneySkippedPlayers = Record<string, boolean>;
export type JourneyPlayersById = Record<string, JourneyPlayer>;
export type JourneyMovesByPlayerId = Record<string, JourneyMove>;
export type JourneyAchievementsByPlayerId = Record<string, JourneyAchievement[]>;
export type JourneyMovesByNickname = Record<string, JourneyMove>;
export type JourneyAchievementsByNickname = Record<string, JourneyAchievement[]>;
export type JourneyParsedMoves = Record<string, number>;

export interface JourneyTimelineEntry extends JourneyRoundEntry {
  roundIndex: number | string;
}

export interface JourneyMoveInput {
  playerId: string;
  dice: number;
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
  playersOnCell: JourneyPlayer[];
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
