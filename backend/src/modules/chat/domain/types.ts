export enum ChatTransport {
  DIRECT = "direct",
  CLAN = "clan",
}

export interface ParsedChatMessage {
  from: string;
  to: string[];
  text: string;
  timestamp: string | null;
  sourceLineNumber: number;
}
