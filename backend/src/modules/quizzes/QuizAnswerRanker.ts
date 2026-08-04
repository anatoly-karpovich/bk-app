import type { QuizChatMessage, QuizPlayerAnswerDecision } from "./domain/types";

export interface RankedQuizAnswer {
  playerName: string;
  selectedMessageId: string;
  timestamp: string | null;
  firstSeenOrder: number;
  position: number;
}

export class QuizAnswerRanker {
  rank(messages: QuizChatMessage[], decisions: QuizPlayerAnswerDecision[], questionStartedAt: string | null): RankedQuizAnswer[] {
    const messagesById = new Map(messages.map((message) => [message.id, message]));
    return decisions
      .filter((decision) => decision.status === "accepted" && decision.selectedMessageId)
      .map((decision) => {
        const message = messagesById.get(decision.selectedMessageId!);
        if (!message || message.from !== decision.playerName) throw new Error("Недопустимое решение по ответу игрока");
        return { playerName: decision.playerName, selectedMessageId: message.id, timestamp: message.timestamp, firstSeenOrder: message.firstSeenOrder };
      })
      .sort((left, right) => this.compare(left, right, questionStartedAt))
      .map((answer, index) => ({ ...answer, position: index + 1 }));
  }

  compare(left: Pick<RankedQuizAnswer, "timestamp" | "firstSeenOrder">, right: Pick<RankedQuizAnswer, "timestamp" | "firstSeenOrder">, questionStartedAt: string | null): number {
    const leftOrder = this.relativeMinutes(left.timestamp, questionStartedAt);
    const rightOrder = this.relativeMinutes(right.timestamp, questionStartedAt);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.firstSeenOrder - right.firstSeenOrder;
  }

  private relativeMinutes(timestamp: string | null, questionStartedAt: string | null): number {
    if (!timestamp) return Number.MAX_SAFE_INTEGER;
    const [hour, minute] = timestamp.split(":").map(Number);
    const messageMinutes = hour * 60 + minute;
    if (!questionStartedAt) return messageMinutes;
    const started = new Date(questionStartedAt);
    const startMinutes = started.getHours() * 60 + started.getMinutes();
    return (messageMinutes - startMinutes + 24 * 60) % (24 * 60);
  }
}
