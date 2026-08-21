export enum ChatTransport {
  TO = "to",
  PRIVATE = "private",
  CLAN = "clan",
  /** Retained for messages saved before direct deliveries were split into `to` and `private`. */
  DIRECT = "direct",
}

export interface ParsedChatMessage {
  from: string;
  to: string[];
  text: string;
  timestamp: string | null;
  sourceLineNumber: number;
  transport: ChatTransport | null;
}
