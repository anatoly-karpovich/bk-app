import assert from "node:assert/strict";
import test from "node:test";
import type { QuizEventQuestion } from "../domain/types";
import { QuizEventSummaryCalculator } from "./QuizEventSummaryCalculator";

function question(input: Pick<QuizEventQuestion, "id" | "conductedOrder" | "reviewedAt" | "selectedAnswers" | "awards">): QuizEventQuestion {
  return {
    ...input,
    quizQuestionId: input.id,
    questionIndex: 1,
    reviewedByUserId: input.reviewedAt ? "host" : null,
    message: {
      messageTextOverride: null, messageTextUpdatedAt: null, messageTextUpdatedByUserId: null,
      answerTextOverride: null, answerTextUpdatedAt: null, answerTextUpdatedByUserId: null,
    },
    chatFragments: [], chatMessages: [], updatedAt: "now",
  };
}

test("includes only reviewed conducted questions and their persisted awards", () => {
  const reviewed = question({
    id: "reviewed", conductedOrder: 1, reviewedAt: "now",
    selectedAnswers: [{ playerName: "Alice", selectedMessageId: "message-1" }],
    awards: [{
      id: "award", selectedMessageId: "message-1", playerName: "Alice", questionIndex: 1,
      source: { kind: "regular_all", questionIndex: 1, conductedOrder: 1, position: null, regularRuleMode: "all_accepted", bonusRuleId: null },
      rewards: [{ resourceId: "coins", amount: 5 }], awardedAt: "now",
    }],
  });
  const unreviewed = question({
    id: "unreviewed", conductedOrder: 2, reviewedAt: null,
    selectedAnswers: [{ playerName: "Bob", selectedMessageId: "message-2" }], awards: [],
  });
  const unused = question({ id: "unused", conductedOrder: null, reviewedAt: null, selectedAnswers: [], awards: [] });

  const summary = new QuizEventSummaryCalculator().calculate([reviewed, unreviewed, unused], "2026-08-04T12:00:00.000Z");

  assert.equal(summary.totalPreparedQuestions, 3);
  assert.equal(summary.totalConductedQuestions, 2);
  assert.equal(summary.totalReviewedQuestions, 1);
  assert.equal(summary.totalSelectedAnswers, 1);
  assert.equal(summary.totalUniquePlayers, 1);
  assert.deepEqual(summary.players.map((player) => [player.playerName, player.totalRewards]), [["Alice", [{ resourceId: "coins", amount: 5 }]]]);
});
