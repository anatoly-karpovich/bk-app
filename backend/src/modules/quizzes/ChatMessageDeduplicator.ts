import { ChatMessageIdentity } from "../chat/ChatMessageIdentity";
import type { QuizChatMessage, QuizChatMessageCandidate } from "./domain/types";

export interface DeduplicationResult<T> {
  unique: T[];
  duplicatesCount: number;
}

export class ChatMessageDeduplicator {
  constructor(private readonly identity: ChatMessageIdentity) {}

  deduplicate(existing: QuizChatMessage[], incoming: QuizChatMessageCandidate[]): DeduplicationResult<QuizChatMessageCandidate> {
    const known = new Set(existing.map((message) => message.canonicalKey));
    const unique: QuizChatMessageCandidate[] = [];
    let duplicatesCount = 0;
    for (const candidate of incoming) {
      const key = this.identity.createKey(candidate);
      if (known.has(key)) {
        duplicatesCount += 1;
        continue;
      }
      known.add(key);
      unique.push(candidate);
    }
    return { unique, duplicatesCount };
  }
}
