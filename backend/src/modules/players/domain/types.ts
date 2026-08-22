export interface PlayerAlias {
  nickname: string;
  key: string;
}

export interface Player {
  projectId: string;
  nickname: string;
  aliases: PlayerAlias[];
  createdAt: string;
  updatedAt: string;
}

export interface PlayerView {
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
