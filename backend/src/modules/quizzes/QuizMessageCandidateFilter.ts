import { ChatMessageIdentity } from "../chat/ChatMessageIdentity";
import { ChatTransport, type ParsedChatMessage } from "../chat/domain/types";
import type { QuizChatMessageCandidate } from "./domain/types";

export interface QuizMessageFilterContext {
  hostNickname: string;
  allowedTransports: ChatTransport[];
}

export class QuizMessageCandidateFilter {
  constructor(private readonly identity: ChatMessageIdentity) {}

  filter(messages: ParsedChatMessage[], context: QuizMessageFilterContext): QuizChatMessageCandidate[] {
    return messages.flatMap((message) => {
      if (message.from === context.hostNickname) return [];
      const transport = message.to.includes("klan") ? ChatTransport.CLAN : ChatTransport.DIRECT;
      const accepted = transport === ChatTransport.CLAN
        ? context.allowedTransports.includes(ChatTransport.CLAN) && message.to.includes("klan")
        : context.allowedTransports.includes(ChatTransport.DIRECT) && message.to.includes(context.hostNickname);
      if (!accepted) return [];
      return [{ ...message, transport, canonicalKey: this.identity.createKey(message) }];
    });
  }
}
