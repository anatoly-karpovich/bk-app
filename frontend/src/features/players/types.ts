export interface ProjectPlayer {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    projectId: string;
  };
  content: {
    nickname: string;
    aliases: string[];
  };
}

export interface PlayerReferenceInput {
  nickname: string;
  playerRefId: string | null;
}
