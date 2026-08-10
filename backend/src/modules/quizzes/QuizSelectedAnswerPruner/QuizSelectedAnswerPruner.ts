import type { QuizChatMessage, QuizSelectedAnswer } from "../domain/types";

export interface QuizSelectedAnswerPruneResult {
  selections: QuizSelectedAnswer[];
  removedCount: number;
}

/** Removes selections that no longer refer to a message in the effective chat. */
export class QuizSelectedAnswerPruner {
  prune(selections: QuizSelectedAnswer[], effectiveMessages: QuizChatMessage[]): QuizSelectedAnswerPruneResult {
    const messagesById = new Map(effectiveMessages.map((message) => [message.id, message]));
    const retained = selections.filter((selection) => {
      const message = messagesById.get(selection.selectedMessageId);
      return message?.from === selection.playerName;
    });
    return { selections: retained, removedCount: selections.length - retained.length };
  }
}
