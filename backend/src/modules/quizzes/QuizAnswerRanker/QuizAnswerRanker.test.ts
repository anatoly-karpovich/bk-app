import assert from "node:assert/strict";
import test from "node:test";
import { ChatTransport } from "../../chat/domain/types";
import { QuizAnswerRanker } from "./QuizAnswerRanker";
import type { QuizChatMessage, QuizPlayerAnswerDecision } from "../domain/types";

const message = (id: string, from: string, timestamp: string | null, firstSeenOrder: number): QuizChatMessage => ({
  id,
  from,
  to: ["Dark"],
  text: id,
  timestamp,
  firstSeenOrder,
  firstSeenFragmentId: "fragment",
  sourceLineNumber: firstSeenOrder,
  transport: ChatTransport.DIRECT,
  canonicalKey: id,
});
const accepted = (playerName: string, selectedMessageId: string): QuizPlayerAnswerDecision => ({
  playerName,
  status: "accepted",
  selectedMessageId,
  decidedAt: "now",
  decidedByUserId: "host",
});

test("ranks only accepted selected messages by time, then first-seen order, with missing times last", () => {
  const result = new QuizAnswerRanker().rank(
    [
      message("late", "Alice", "21:02", 3),
      message("early", "Bob", "21:01", 2),
      message("tie", "Cara", "21:01", 1),
      message("none", "Dana", null, 4),
    ],
    [
      accepted("Alice", "late"),
      accepted("Bob", "early"),
      accepted("Cara", "tie"),
      accepted("Dana", "none"),
      { playerName: "Ignored", status: "pending", selectedMessageId: null, decidedAt: null, decidedByUserId: null },
    ],
    null,
  );
  assert.deepEqual(
    result.map((item) => [item.playerName, item.position]),
    [
      ["Cara", 1],
      ["Bob", 2],
      ["Alice", 3],
      ["Dana", 4],
    ],
  );
});

test("uses the question-start rollover and rejects invalid selected-message ownership", () => {
  const start = new Date();
  start.setHours(23, 55, 0, 0);
  const ranker = new QuizAnswerRanker();
  const result = ranker.rank(
    [message("before", "Alice", "23:59", 1), message("after", "Bob", "00:01", 2)],
    [accepted("Alice", "before"), accepted("Bob", "after")],
    start.toISOString(),
  );
  assert.deepEqual(
    result.map((item) => item.playerName),
    ["Alice", "Bob"],
  );
  assert.throws(() => ranker.rank([message("message", "Alice", "21:00", 1)], [accepted("Bob", "message")], null));
});
