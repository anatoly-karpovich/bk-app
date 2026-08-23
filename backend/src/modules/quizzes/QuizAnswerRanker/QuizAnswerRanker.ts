import type { QuizChatMessage, QuizSelectedAnswer } from "../domain/types";

export interface RankedQuizAnswer {
  playerName: string;
  playerRefId?: string;
  selectedMessageId: string;
  timestamp: string | null;
  effectiveOrder: number;
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
          playerRefId: selection.playerRefId,
          selectedMessageId: message.id,
          timestamp: message.timestamp,
          effectiveOrder: message.effectiveOrder,
        };
      })
      .sort((left, right) => this.compare(left, right))
      .map((answer, index) => ({ ...answer, position: index + 1 }));
  }

  compare(
    left: Pick<RankedQuizAnswer, "timestamp" | "effectiveOrder">,
    right: Pick<RankedQuizAnswer, "timestamp" | "effectiveOrder">,
  ): number {
    const leftOrder = this.minutes(left.timestamp);
    const rightOrder = this.minutes(right.timestamp);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.effectiveOrder - right.effectiveOrder;
  }

  private minutes(timestamp: string | null): number {
    if (!timestamp) return Number.MAX_SAFE_INTEGER;
    const [hour, minute] = timestamp.split(":").map(Number);
    return hour * 60 + minute;
  }
}
