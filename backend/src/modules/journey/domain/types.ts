import type { ResourceAmount, ResourceHoldings, ResourceLimit, ResourceSnapshot, RewardPool } from "../../rewards";

export type RandomFn = () => number;
export type JourneyCellKind = "bonus" | "trap";
export type JourneyJackpotCountMode = "fixed" | "by_players";
export type JourneyPlayerStatus = "active" | "finished" | "removed";
export type JourneyGameStatus = "in_progress" | "finished";
export type JourneySkippedMoveType = "skipped";
export type JourneyMoveType =
  | "moveWithJackpot" | "moveWithEmptyJackpot" | "moveWithIncreasingPrize" | "moveWithDecreasingPrize"
  | "moveWithoutBonus" | "moveToFinish" | "moveWithMaxPrize" | "moveToMaxPrize"
  | "moveToZeroPrize" | "moveWithZeroPrize" | "moveToAchievement";

export type JourneyMoveCommentTemplateKind = `move:${Exclude<JourneyMoveType, "moveToAchievement">}`;
export type JourneyCommentTemplateKind = JourneyMoveCommentTemplateKind
  | "jackpot:empty_reward"
  | "achievement:unlucky"
  | "achievement:careful"
  | "achievement:collector"
  | "achievement:lucky"
  | "achievement:empty_reward"
  | "skip";
/** Only for rendering snapshots written before limit messages were removed. */
export type JourneyLegacyCommentTemplateKind = "limit:gain" | "limit:loss";
export type JourneyStoredCommentTemplateKind = JourneyCommentTemplateKind | JourneyLegacyCommentTemplateKind;

export function toJourneyMoveCommentTemplateKind(
  moveType: Exclude<JourneyMoveType, "moveToAchievement">,
): JourneyMoveCommentTemplateKind {
  return `move:${moveType}`;
}

export interface JourneyCommentTemplate { id: string; text: string; }
export type JourneyCommentTemplatesSnapshot = Record<JourneyCommentTemplateKind, JourneyCommentTemplate[]> & Partial<Record<JourneyLegacyCommentTemplateKind, JourneyCommentTemplate[]>>;
export type JourneyLastSelectedCommentIds = Partial<Record<JourneyStoredCommentTemplateKind, string>>;
export interface JourneyCommentState { snapshot: JourneyCommentTemplatesSnapshot; lastSelectedIds: JourneyLastSelectedCommentIds; }
export interface JourneyCommentReference { kind: JourneyStoredCommentTemplateKind; templateId: string; }

/** Offline legacy-normalization shape. Runtime Journey V2 uses ResourceAmount. */
export interface JourneyCurrencyValue { currencyId: string; value: number; }
export type JourneyBalance = ResourceHoldings;
export type JourneyResourceAmount = ResourceAmount;

export interface JourneyRulesCell {
  id: string;
  kind: JourneyCellKind;
  mapLabel: string;
  rewardPool: RewardPool;
  count: number;
}

export type JourneyCollectorTargetKind = JourneyCellKind | "empty";
export interface JourneyCollectorTarget { key: string; id: string; kind: JourneyCollectorTargetKind; mapLabel: string; rewardPool: RewardPool | null; }

export interface JourneyRulesAchievementConfig { rewardPool: RewardPool; }
export interface JourneyRulesAchievements {
  unlucky: JourneyRulesAchievementConfig;
  careful: JourneyRulesAchievementConfig;
  collector: JourneyRulesAchievementConfig;
  lucky: JourneyRulesAchievementConfig;
}
export interface JourneyRules {
  initialRewardPool: RewardPool;
  minDice: number;
  maxDice: number;
  resourceLimits: ResourceLimit[];
  mapSize: number;
  jackpot: { countMode: JourneyJackpotCountMode; count: number; playersPerJackpot: number; rewardPool: RewardPool; };
  cells: JourneyRulesCell[];
  achievements: JourneyRulesAchievements;
}
export type JourneyRulesInput = Partial<JourneyRules> & {
  jackpot?: Partial<JourneyRules["jackpot"]>;
  achievements?: Partial<JourneyRulesAchievements>;
  cells?: JourneyRulesCell[];
};

export interface JourneyConfig {
  mapSize: number; finishPosition: number; initialRewardPool: RewardPool; minDice: number; maxDice: number;
  resourceLimits: ResourceLimit[]; jackpotRewardPool: RewardPool; resources: ResourceSnapshot[];
}
export interface JourneyAchievement { name: string; title?: string; rewardPool: RewardPool; description?: string; }
export interface JourneyAchievementsMap { JACKPOT: JourneyAchievement; UNLUCKY: JourneyAchievement; CAREFUL: JourneyAchievement; COLLECTOR: JourneyAchievement; LUCKY: JourneyAchievement; }
export interface JourneyMapCellWinner { nickname: string; }
export interface JourneyMapCell { id: string; kind: JourneyCellKind; mapLabel?: string; rewardPool: RewardPool; isJackpot?: boolean; winner?: JourneyMapCellWinner | null; }

export interface JourneyV2Player {
  id: string; nickname: string; status: JourneyPlayerStatus; removedAt: string | null; removedReason: string | null;
  position: number; balance: ResourceHoldings; initialRewards?: ResourceAmount[]; achievementNames: string[];
}
export interface JourneyV2AchievementEffect { name: string; requestedRewards: ResourceAmount[]; resolvedRewards: ResourceAmount[]; appliedRewards: ResourceAmount[]; commentRefs: JourneyCommentReference[]; }
export type JourneyV2Turn =
  | { kind: "move"; playerId: string; dice: number; from: number; to: number; moveType: JourneyMoveType;
      requestedRewards: ResourceAmount[]; resolvedRewards: ResourceAmount[]; appliedRewards: ResourceAmount[]; achievementEffects: JourneyV2AchievementEffect[]; commentRefs: JourneyCommentReference[]; }
  | { kind: "skip"; playerId: string; commentRefs: JourneyCommentReference[]; };
export interface JourneyV2Round { index: number; occurredAt: string; turns: JourneyV2Turn[]; }
export interface JourneyV2State { moveIndex: number; status: JourneyGameStatus; map: Record<number, JourneyMapCell>; players: JourneyV2Player[]; rounds: JourneyV2Round[]; forumLog: string[]; commentState?: JourneyCommentState; }
export interface JourneyV2Game {
  storageFormat: "v2"; createdAt: string; updatedAt: string; djName: string; projectId: string; configId: string; configName: string;
  hostUserId?: string; hostSnapshot?: import("../../auth/domain/types").HostSnapshot;
  forumTopicId: number | null; resources: ResourceSnapshot[]; rules: JourneyRules; stateV2: JourneyV2State;
}

export interface JourneyAwardedBonus {
  name: string; title?: string; description?: string; source: "achievement" | "jackpot"; appliedRewards: ResourceAmount[];
}
export interface JourneyGameViewPlayer {
  id: string; nickname: string; status: JourneyPlayerStatus; position: number;
  baseRewardEntries: ResourceAmount[]; bonusRewardEntries: ResourceAmount[]; balanceEntries: ResourceAmount[]; bonuses: JourneyAwardedBonus[];
}
export interface JourneyHistoryEntryView {
  createdAt: string; roundIndex: number | string; skipped: boolean; previousPosition: number | null; currentPosition: number | null;
  requestedRewards: ResourceAmount[]; resolvedRewards: ResourceAmount[]; appliedRewards: ResourceAmount[];
  balanceAfterRound: ResourceAmount[] | null; cell: JourneyMapCell | null; achievementsAwarded: JourneyAchievement[];
}
export interface JourneyGameView {
  id: string; createdAt: string; updatedAt: string;
  meta: {
    status: JourneyGameStatus; isOver: boolean; roundIndex: number; djName: string; projectId: string; configId: string; configName: string; forumTopicId: number | null;
    hostUserId?: string; hostSnapshot?: import("../../auth/domain/types").HostSnapshot;
  };
  configuration: { resources: ResourceSnapshot[]; rules: JourneyRules; journeyConfig: JourneyConfig; achievements: JourneyAchievementsMap; collectorTargets: JourneyCollectorTarget[]; };
  state: { board: Record<number, JourneyMapCell>; players: JourneyGameViewPlayer[]; activePlayerIds: string[]; finishedPlayerIds: string[]; visiblePlayerIds: string[]; resultPlayerIds: string[]; };
  achievements: { progressByPlayerId: Record<string, JourneyAchievementProgress>; };
  history: { byPlayerId: Record<string, JourneyHistoryEntryView[]>; };
  forumLog: string[];
}
export interface JourneyGameListItemReadModel {
  id: string; createdAt: string; updatedAt: string; status: JourneyGameStatus; djName: string; projectId: string; configId: string; configName: string;
  resources: ResourceSnapshot[]; roundsCount: number; players: Array<{ id: string; nickname: string; status: JourneyPlayerStatus; position: number; balanceEntries: ResourceAmount[]; }>;
  hostUserId?: string;
}
export interface JourneyMoveInput { playerId: string; dice: number; }
export interface JourneyCollectorProgress { achieved: boolean; obtainedCellKeys: string[]; missingCellKeys: string[]; }
export interface JourneyStreakProgress { achieved: boolean; current: number; best: number; target: number; }
export interface JourneyAchievementProgress { collector: JourneyCollectorProgress; unlucky: JourneyStreakProgress; careful: JourneyStreakProgress; lucky: JourneyStreakProgress; }

/* Legacy-only exported placeholders for the offline normalizer. */
export interface JourneyPlayer { id: string; nickname: string; status: JourneyPlayerStatus; position: number; balance: JourneyBalance; bonuses: JourneyAchievement[]; movesHistory: Array<{ position: number; cell: JourneyMapCell | null; type: JourneyMoveType }>; removedAt: string | null; removedReason: string | null; previousBalance: JourneyBalance; }
export interface JourneyMove { playerId: string; playerNickname: string; dice: number; previousPosition: number; previousBalance: JourneyBalance; currentPosition: number; balanceAfterMove: JourneyBalance; requestedRewards: JourneyCurrencyValue[]; appliedRewards: JourneyCurrencyValue[]; cell: JourneyMapCell | null; type: JourneyMoveType; }
export interface JourneyAchievementMove { type: "moveToAchievement"; playerId: string; playerNickname: string; achievement: JourneyAchievement; appliedRewards: JourneyCurrencyValue[]; }
export interface JourneyRoundEntry { createdAt: string; playerId: string | null; nickname: string; playerStatusBeforeRound: JourneyPlayerStatus | null; playerStatusAfterRound: JourneyPlayerStatus | null; skipped: boolean; dice: number | null; previousPosition: number | null; currentPosition: number | null; previousBalance: JourneyCurrencyValue[] | null; appliedRewards: JourneyCurrencyValue[]; balanceAfterMove: JourneyCurrencyValue[] | null; balanceAfterRound: JourneyCurrencyValue[] | null; moveType: JourneyMoveType | JourneySkippedMoveType | null; cell: JourneyMapCell | null; achievementsAwarded: JourneyAchievement[]; bonusesSnapshot: JourneyAchievement[]; }
export interface JourneyRound { createdAt: string; moveIndex: number; entries: JourneyRoundEntry[]; movesByPlayerId?: Record<string, JourneyMove>; movesByNickname?: Record<string, JourneyMove>; skippedPlayerIds?: string[]; skippedNicknames?: string[]; achievementMoves?: JourneyAchievementMove[]; }
export interface JourneyGame { createdAt: string; updatedAt: string; moveIndex: number; status: JourneyGameStatus; djName: string; projectId: string; configId: string; configName: string; currencies: never[]; rules: JourneyRules; map: Record<number, JourneyMapCell>; players: JourneyPlayer[]; playersById: Record<string, JourneyPlayer>; rounds: JourneyRound[]; comments: string[]; }
export interface JourneyPlayerReadModel extends JourneyPlayer { balanceEntries: JourneyCurrencyValue[]; }
export interface JourneyTimelineEntry extends JourneyRoundEntry { roundIndex: number | string; }
