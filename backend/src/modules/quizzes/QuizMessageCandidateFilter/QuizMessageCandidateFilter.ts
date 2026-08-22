import { ChatMessageIdentity } from "../../chat/ChatMessageIdentity";
import { ChatTransport, type ParsedChatMessage } from "../../chat/domain/types";
import type { QuizChatMessageCandidate } from "../domain/types";

export interface QuizMessageFilterContext {
  hostNickname: string;
  allowedTransports: ChatTransport[];
}

export class QuizMessageCandidateFilter {
  constructor(private readonly identity: ChatMessageIdentity) {}

  filter(messages: ParsedChatMessage[], context: QuizMessageFilterContext): QuizChatMessageCandidate[] {
    return messages.flatMap((message) => {
      if (message.from === context.hostNickname) return [];
      if (message.transport === null || message.to.includes("klan")) return [];
      const transport = message.transport;
      const accepted = context.allowedTransports.includes(transport) && message.to.includes(context.hostNickname);
      if (!accepted) return [];
      return [{ ...message, transport, canonicalKey: this.identity.createKey({ ...message, transport }) }];
    });
  }
}
