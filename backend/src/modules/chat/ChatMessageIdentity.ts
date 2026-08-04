export interface ChatMessageIdentityInput {
  from: string;
  to: string[];
  text: string;
  timestamp: string | null;
}

export class ChatMessageIdentity {
  createKey(message: ChatMessageIdentityInput): string {
    return JSON.stringify([message.from, [...message.to].sort(), message.text, message.timestamp]);
  }
}
