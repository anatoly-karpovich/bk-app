import type { ProjectActivityTypeSettings } from "../projects/types";

export interface ActivityResultListItem {
  id: string;
  title: string;
  type: string;
  conductedOn: string | null;
  recipientsCount: number;
  hostNickname: string;
  revision: number;
  access: {
    canUpdate: boolean;
    canDelete: boolean;
  };
  updatedAt: string;
}

export interface ActivityResourceAmountDraft {
  resourceId: string;
  amount: number;
}

export interface ActivityParticipantDraft {
  id: string;
  nickname: string;
  playerRefId: string | null;
  rewards: {
    regular: ActivityResourceAmountDraft[];
    bonus: ActivityResourceAmountDraft[];
  };
}

export interface ActivityResultDraft {
  type: string;
  title: string;
  conductedOn: string | null;
  participants: ActivityParticipantDraft[];
}

export interface ActivityResult {
  id: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  hostNickname: string;
  access: {
    mode: "manage" | "read_only";
    canUpdate: boolean;
    canDelete: boolean;
  };
  draft: ActivityResultDraft;
  resources: Array<{ id: string; code: string; name: string; label: string; type: "currency" | "item" }>;
}

export type ActivityResultInput = Omit<ActivityResultDraft, "participants"> & {
  participants: Array<Omit<ActivityParticipantDraft, "id">>;
};

export type ActivityTypeSettings = ProjectActivityTypeSettings;
