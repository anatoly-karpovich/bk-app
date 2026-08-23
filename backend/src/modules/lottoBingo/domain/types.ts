import type { HostSnapshot } from "../../auth/domain/types";
import type { ResourceAmount, ResourceSnapshot, RewardPool } from "../../rewards";

export type LottoBingoRound = 1 | 2 | 3;
export type LottoBingoStatus = "preparing" | "in_progress" | "finished";
export type LottoBingoPhase =
  | "registration"
  | "round1"
  | "round2"
  | "round3"
  | "remaining_barrels"
  | "ready_to_finalize"
  | "finished";
export type LottoBingoPlayerStatus = "active" | "round_winner" | "disqualified";
export type LottoBingoTicketCell = number | null;
export type LottoBingoTicketGrid = LottoBingoTicketCell[][];

export interface LottoBingoRules {
  barrelsToDraw: 87 | 88 | 89;
  rewards: {
    round1: RewardPool;
    round2: RewardPool;
    round3: RewardPool;
    completedCard: RewardPool;
    consolation: RewardPool;
  };
}

export type LottoBingoRulesInput = Partial<LottoBingoRules> & {
  rewards?: Partial<LottoBingoRules["rewards"]>;
};

export interface LottoBingoTicket {
  number: number;
  grid: LottoBingoTicketGrid;
}

export type LottoBingoPlayerAward =
  | { type: "round"; round: LottoBingoRound; rewards: ResourceAmount[] }
  | { type: "completed_card"; rewards: ResourceAmount[] }
  | { type: "consolation"; rewards: ResourceAmount[] };

export interface LottoBingoPlayer {
  id: string;
  /** Stable project-scoped Player identity; optional while historical games are migrated. */
  playerRefId?: string;
  nickname: string;
  ticket: LottoBingoTicket;
  status: LottoBingoPlayerStatus;
  award: LottoBingoPlayerAward | null;
}

export interface LottoBingoPlayerIdentity {
  nickname: string;
  playerRefId: string;
}

export interface LottoBingoDrawState {
  plannedOrder: number[];
  outOfGameNumbers: number[];
  cursor: number;
}

export interface LottoBingoRoundWinner {
  playerId: string;
  confirmedAt: string;
  confirmedOnDraw: number;
  winningBarrel: number | null;
  payoutId: string;
}

export interface LottoBingoWinners {
  round1: LottoBingoRoundWinner[];
  round2: LottoBingoRoundWinner[];
  round3: LottoBingoRoundWinner[];
}

export type LottoBingoPayoutCategory = "round1" | "round2" | "round3" | "completed_card" | "consolation";
export interface LottoBingoPayout {
  id: string;
  playerId: string;
  category: LottoBingoPayoutCategory;
  resolvedRewards: ResourceAmount[];
  createdAt: string;
}

export interface LottoBingoEligibilityState {
  round: LottoBingoRound;
  eligibleSinceDrawByPlayerId: Record<string, number>;
}

export type LottoBingoMutationType =
  | "game_created"
  | "player_added"
  | "player_removed"
  | "game_started"
  | "barrel_drawn"
  | "barrel_undone"
  | "winner_confirmed"
  | "player_disqualified"
  | "player_restored"
  | "game_finished";

export interface LottoBingoAuditEvent {
  id: string;
  sequence: number;
  type: LottoBingoMutationType;
  actor: HostSnapshot;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface LottoBingoGame {
  projectId: string;
  configId: string;
  configName: string;
  hostUserId: string;
  hostSnapshot: HostSnapshot;
  rules: LottoBingoRules;
  resources: ResourceSnapshot[];
  status: LottoBingoStatus;
  players: LottoBingoPlayer[];
  nextTicketNumber: number;
  draw: LottoBingoDrawState | null;
  winners: LottoBingoWinners;
  payouts: LottoBingoPayout[];
  eligibility: LottoBingoEligibilityState | null;
  revision: number;
  lastMutation: LottoBingoMutationType;
  audit: LottoBingoAuditEvent[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface LottoBingoGameMetaView {
  projectId: string;
  configId: string;
  configName: string;
  status: LottoBingoStatus;
  phase: LottoBingoPhase;
  revision: number;
  host: HostSnapshot;
  startedAt: string | null;
  finishedAt: string | null;
  access: {
    mode: "manage" | "read_only";
    canAddPlayer: boolean;
    canRemovePlayer: boolean;
    canStart: boolean;
    canDraw: boolean;
    canUndoDraw: boolean;
    canConfirmWinner: boolean;
    canDisqualifyPlayer: boolean;
    canRestorePlayer: boolean;
    canFinalize: boolean;
    canDelete: boolean;
  };
}

export interface LottoBingoGameView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: LottoBingoGameMetaView;
  configuration: { rules: LottoBingoRules; resources: ResourceSnapshot[] };
  state: {
    draw: {
      currentBarrel: number | null;
      drawnNumbers: number[];
      drawnCount: number;
      plannedDrawCount: number;
      plannedRemainingCount: number;
      outOfGameCount: number;
    };
    round: {
      activeRound: LottoBingoRound | null;
      candidates: LottoBingoCandidateView[];
      hasUnconfirmedCandidates: boolean;
      requiresDrawWithoutWinnerConfirmation: boolean;
    };
    players: LottoBingoPlayerView[];
    winners: Record<"round1" | "round2" | "round3", LottoBingoRoundWinnerView[]>;
    rewards: {
      roundPayouts: LottoBingoPayoutView[];
      finalPreview: LottoBingoFinalRewardPreview | null;
      finalPayouts: LottoBingoPayoutView[];
    };
    timeline: LottoBingoTimelineEventView[];
  };
}

export interface LottoBingoCandidateView {
  playerId: string;
  nickname: string;
  eligibleSinceDraw: number;
  becameEligibleOnLatestDraw: boolean;
  matchedAreas: LottoBingoMatchedAreaView[];
}
export type LottoBingoMatchedAreaView =
  | { type: "row"; rowIndexes: number[] }
  | { type: "half"; half: "top" | "bottom"; rowIndexes: number[] }
  | { type: "full_card"; rowIndexes: number[] };
export interface LottoBingoPlayerView {
  id: string;
  nickname: string;
  ticket: LottoBingoTicket;
  status: LottoBingoPlayerStatus;
  progress: {
    matchedNumbers: number[];
    remainingNumbers: number[];
    matchedCount: number;
    remainingCount: number;
    completedRowIndexes: number[];
    completedHalves: Array<"top" | "bottom">;
    completedCard: boolean;
  };
  eligibility: {
    isCurrentRoundCandidate: boolean;
    eligibleSinceDraw: number | null;
    excludedFromRoundRewards: boolean;
    excludedFromFinalRewards: boolean;
  };
  award: LottoBingoPlayerAward | null;
}
export interface LottoBingoRoundWinnerView extends LottoBingoRoundWinner {
  nickname: string;
  rewards: ResourceAmount[];
}
export interface LottoBingoPayoutView extends LottoBingoPayout {
  nickname: string;
}
export interface LottoBingoFinalRewardPreview {
  completedCardPlayers: LottoBingoRewardRecipientPreview[];
  consolationPlayers: LottoBingoRewardRecipientPreview[];
}
export interface LottoBingoRewardRecipientPreview {
  playerId: string;
  nickname: string;
  projectedRewards: ResourceAmount[];
}
export interface LottoBingoTimelineEventView {
  id: string;
  type: LottoBingoMutationType;
  createdAt: string;
  actorName: string;
  message: string;
}
export interface LottoBingoGameListItemView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: Pick<
    LottoBingoGameMetaView,
    "projectId" | "configId" | "configName" | "status" | "phase" | "host" | "startedAt" | "finishedAt"
  >;
  state: { playersCount: number; drawnBarrelsCount: number; winners: Record<"round1" | "round2" | "round3", string[]> };
}
