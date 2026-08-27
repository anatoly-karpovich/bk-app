import type { HostSnapshot } from "../../auth/domain/types";
import type { AnalyticsSourceType } from "../../analytics/domain/sourceTypes";
import type { ResourceAmount, ResourceSnapshot } from "../../rewards";

export const ACTIVITY_RESULT_TITLE_MAX_LENGTH = 160;
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
  participants: ActivityResultParticipant[];
  resourceSnapshot: ResourceSnapshot[];
  hostUserId: string;
  hostSnapshot: HostSnapshot;
  revision: number;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

export interface ActivityResultView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    projectId: string;
    revision: number;
    host: HostSnapshot;
    access: {
      mode: "manage" | "read_only";
      canUpdate: boolean;
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
}
