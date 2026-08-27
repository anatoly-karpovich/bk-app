import type { HostSnapshot } from "../../auth/domain/types";
import type { AnalyticsSourceType } from "../../analytics/domain/sourceTypes";
import type { ResourceAmount, ResourceSnapshot } from "../../rewards";

export const ACTIVITY_RESULT_TITLE_MAX_LENGTH = 160;
export const ACTIVITY_RESULT_STATUSES = ["draft", "completed"] as const;
export type ActivityResultStatus = (typeof ACTIVITY_RESULT_STATUSES)[number];
export type ActivityType = AnalyticsSourceType;

export interface ActivityResultParticipant {
  playerRefId: string;
  nicknameSnapshot: string;
  rewards: {
    regular: ResourceAmount[];
    bonus: ResourceAmount[];
  };
}

export interface ActivityResultDocument {
  projectId: string;
  type: ActivityType;
  title: string;
  conductedOn: string | null;
  status: ActivityResultStatus;
  participants: ActivityResultParticipant[];
  resourceSnapshot: ResourceSnapshot[];
  hostUserId: string;
  hostSnapshot: HostSnapshot;
  revision: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

export interface ActivityResultValidationIssue {
  code: "activity_requires_awarded_participant";
}

export interface ActivityResultView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    projectId: string;
    status: ActivityResultStatus;
    revision: number;
    host: HostSnapshot;
    completedAt: string | null;
    access: {
      mode: "manage" | "read_only";
      canUpdate: boolean;
      canComplete: boolean;
      canDelete: boolean;
    };
  };
  content: {
    type: ActivityType;
    title: string;
    conductedOn: string | null;
    participants: ActivityResultParticipant[];
  };
  configuration: { resources: ResourceSnapshot[] };
  validation: { issues: ActivityResultValidationIssue[] };
}
