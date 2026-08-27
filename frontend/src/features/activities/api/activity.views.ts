export interface ActivityResourceAmountApi {
  resourceId: string;
  amount: number;
}

export interface ActivityResultApiView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    projectId: string;
    revision: number;
    host: {
      userId: string;
      displayName: string;
      nickname: string;
    };
    access: {
      mode: "manage" | "read_only";
      canUpdate: boolean;
      canDelete: boolean;
    };
  };
  content: {
    type: string;
    title: string;
    conductedOn: string | null;
    participants: Array<{
      playerRefId: string;
      nicknameSnapshot: string;
      rewards: {
        regular: ActivityResourceAmountApi[];
        bonus: ActivityResourceAmountApi[];
      };
    }>;
  };
  configuration: {
    resources: Array<{
      id: string;
      code: string;
      name: string;
      label: string;
      type: "currency" | "item";
    }>;
  };
}
