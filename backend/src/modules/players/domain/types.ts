export interface PlayerAlias {
  nickname: string;
  key: string;
}

export interface Player {
  projectId: string;
  nickname: string;
  /** Normalized current nickname. It is the only automatic identity lookup key. */
  nicknameKey: string;
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
