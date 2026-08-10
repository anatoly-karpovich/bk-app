import { type ChatTransport } from "./domain/types";

export interface ChatMessageIdentityInput {
  from: string;
  to: string[];
  text: string;
  timestamp: string | null;
  transport: ChatTransport;
}

export class ChatMessageIdentity {
  createKey(message: ChatMessageIdentityInput): string {
    return JSON.stringify([
      message.transport,
      message.from.trim(),
      [...new Set(message.to.map((recipient) => recipient.trim()))].sort(),
      message.text
        .replace(/\r\n?/g, "\n")
        .trim()
        .replace(/[\t ]+/g, " "),
      message.timestamp,
    ]);
  }
}
