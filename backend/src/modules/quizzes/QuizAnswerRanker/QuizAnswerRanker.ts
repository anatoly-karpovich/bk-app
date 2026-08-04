import type { QuizChatMessage, QuizSelectedAnswer } from "../domain/types";

export interface RankedQuizAnswer {
  playerName: string;
  selectedMessageId: string;
  timestamp: string | null;
  firstSeenOrder: number;
  position: number;
}

export class QuizAnswerRanker {
  rank(
    messages: QuizChatMessage[],
    selections: QuizSelectedAnswer[],
  ): RankedQuizAnswer[] {
    const messagesById = new Map(messages.map((message) => [message.id, message]));
    return selections
      .map((selection) => {
        const message = messagesById.get(selection.selectedMessageId);
        if (!message || message.from !== selection.playerName) throw new Error("Недопустимый выбранный ответ игрока");
        return {
          playerName: selection.playerName,
          selectedMessageId: message.id,
          timestamp: message.timestamp,
          firstSeenOrder: message.firstSeenOrder,
        };
      })
      .sort((left, right) => this.compare(left, right))
      .map((answer, index) => ({ ...answer, position: index + 1 }));
  }

  compare(
    left: Pick<RankedQuizAnswer, "timestamp" | "firstSeenOrder">,
    right: Pick<RankedQuizAnswer, "timestamp" | "firstSeenOrder">,
  ): number {
    const leftOrder = this.minutes(left.timestamp);
    const rightOrder = this.minutes(right.timestamp);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.firstSeenOrder - right.firstSeenOrder;
  }

  private minutes(timestamp: string | null): number {
    if (!timestamp) return Number.MAX_SAFE_INTEGER;
    const [hour, minute] = timestamp.split(":").map(Number);
    return hour * 60 + minute;
  }
}
