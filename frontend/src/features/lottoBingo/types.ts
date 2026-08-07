import type { ResourceAmount, ResourceDefinition, RewardPool } from "../rewards/types";

export type LottoBingoTicketCell = number | null;
export type LottoBingoTicketGrid = LottoBingoTicketCell[][];
export type LottoBingoRound = 1 | 2 | 3;
export type LottoBingoStatus = "preparing" | "in_progress" | "finished";
export type LottoBingoPhase = "registration" | "round1" | "round2" | "round3" | "remaining_barrels" | "ready_to_finalize" | "finished";
export type LottoBingoPlayerStatus = "active" | "round_winner" | "disqualified";

export interface LottoBingoRules {
  barrelsToDraw: 87 | 88 | 89;
  rewards: Record<"round1" | "round2" | "round3" | "completedCard" | "consolation", RewardPool>;
}

export interface LottoBingoPlayerAward {
  type: "round" | "completed_card" | "consolation";
  round?: LottoBingoRound;
  rewards: ResourceAmount[];
}

export interface LottoBingoCandidate {
  playerId: string;
  nickname: string;
  eligibleSinceDraw: number;
  becameEligibleOnLatestDraw: boolean;
  matchedAreas: Array<{ type: "row" | "half" | "full_card"; rowIndexes: number[]; half?: "top" | "bottom" }>;
}

export interface LottoBingoPlayer {
  id: string;
  nickname: string;
  ticket: { number: number; grid: LottoBingoTicketGrid };
  status: LottoBingoPlayerStatus;
  progress: { matchedNumbers: number[]; remainingNumbers: number[]; matchedCount: number; remainingCount: number; completedRowIndexes: number[]; completedHalves: Array<"top" | "bottom">; completedCard: boolean };
  eligibility: { isCurrentRoundCandidate: boolean; eligibleSinceDraw: number | null; excludedFromRoundRewards: boolean; excludedFromFinalRewards: boolean };
  award: LottoBingoPlayerAward | null;
}

export interface LottoBingoGameView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    projectId: string; configId: string; configName: string; status: LottoBingoStatus; phase: LottoBingoPhase; revision: number;
    host: { nickname: string };
    startedAt: string | null; finishedAt: string | null;
    access: { mode: "manage" | "read_only"; canAddPlayer: boolean; canRemovePlayer: boolean; canStart: boolean; canDraw: boolean; canUndoDraw: boolean; canConfirmWinner: boolean; canDisqualifyPlayer: boolean; canRestorePlayer: boolean; canFinalize: boolean; canDelete: boolean };
  };
  configuration: { rules: LottoBingoRules; resources: ResourceDefinition[] };
  state: {
    draw: { currentBarrel: number | null; drawnNumbers: number[]; drawnCount: number; plannedDrawCount: number; plannedRemainingCount: number; outOfGameCount: number };
    round: { activeRound: LottoBingoRound | null; candidates: LottoBingoCandidate[]; hasUnconfirmedCandidates: boolean; requiresDrawWithoutWinnerConfirmation: boolean };
    players: LottoBingoPlayer[];
    winners: Record<"round1" | "round2" | "round3", Array<{ playerId: string; nickname: string; confirmedAt: string; confirmedOnDraw: number; winningBarrel: number | null; rewards: ResourceAmount[] }>>;
    rewards: { roundPayouts: Array<{ id: string; playerId: string; nickname: string; category: string; resolvedRewards: ResourceAmount[]; createdAt: string }>; finalPreview: { completedCardPlayers: RecipientPreview[]; consolationPlayers: RecipientPreview[] } | null; finalPayouts: Array<{ id: string; playerId: string; nickname: string; category: string; resolvedRewards: ResourceAmount[]; createdAt: string }> };
    timeline: Array<{ id: string; type: string; createdAt: string; actorName: string; message: string }>;
  };
}

export interface RecipientPreview { playerId: string; nickname: string; projectedRewards: ResourceAmount[]; }

export interface LottoBingoSavedGame {
  id: string; createdAt: string; updatedAt: string;
  meta: { projectId: string; configId: string; configName: string; status: LottoBingoStatus; phase: LottoBingoPhase; host: { nickname: string }; startedAt: string | null; finishedAt: string | null };
  state: { playersCount: number; drawnBarrelsCount: number; winners: Record<"round1" | "round2" | "round3", string[]> };
}

export type LottoBingoPageModel = LottoBingoGameView;
