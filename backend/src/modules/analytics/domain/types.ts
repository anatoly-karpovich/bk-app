import type { ResourceAmount, ResourceSnapshot } from "../../rewards";
import type { AnalyticsSourceKind, AnalyticsSourceType } from "./sourceTypes";

export interface AnalyticsSourceStamp {
  kind: AnalyticsSourceKind;
  type: AnalyticsSourceType;
  id: string;
  quizId?: string;
  revision: number | null;
  updatedAt: string;
}

export interface AnalyticsFactIssue {
  code: "missing_player_reference";
  sourcePlayerId?: string;
  nicknameSnapshot: string;
}

export interface AnalyticsParticipantRewards {
  regular: ResourceAmount[];
  bonus: ResourceAmount[];
}

export interface AnalyticsParticipantResult {
  playerRefId: string | null;
  nicknameSnapshot: string;
  rewards: AnalyticsParticipantRewards;
  metrics?: Record<string, number | string | boolean | null>;
}

export interface AnalyticsFactDocument {
  projectId: string;
  occurredAt: string;
  source: AnalyticsSourceStamp;
  participants: AnalyticsParticipantResult[];
  resourceSnapshot: ResourceSnapshot[];
  meta: {
    status: "ready" | "partial";
    issues: AnalyticsFactIssue[];
    computedAt: string;
    schemaVersion: 1;
  };
}
