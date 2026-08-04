import assert from "node:assert/strict";
import test from "node:test";
import { ChatTransport } from "../../chat/domain/types";
import type { QuizChatMessage, QuizSelectedAnswer } from "../domain/types";
import { QuizAnswerRanker } from "./QuizAnswerRanker";

const message = (id: string, from: string, timestamp: string | null, effectiveOrder: number): QuizChatMessage => ({
  id,
  from,
  to: ["Dark"],
  text: id,
  timestamp,
  effectiveOrder,
  sourceFragmentId: "fragment",
  sourceLineNumber: effectiveOrder,
  transport: ChatTransport.DIRECT,
  canonicalKey: id,
});

const selected = (playerName: string, selectedMessageId: string): QuizSelectedAnswer => ({ playerName, selectedMessageId });

test("ranks persisted selections by time, then effective order, with missing times last", () => {
  const result = new QuizAnswerRanker().rank(
    [
      message("late", "Alice", "21:02", 3),
      message("early", "Bob", "21:01", 2),
      message("tie", "Cara", "21:01", 1),
      message("none", "Dana", null, 4),
    ],
    [selected("Alice", "late"), selected("Bob", "early"), selected("Cara", "tie"), selected("Dana", "none")],
  );

  assert.deepEqual(
    result.map((item) => [item.playerName, item.position]),
    [["Cara", 1], ["Bob", 2], ["Alice", 3], ["Dana", 4]],
  );
});

test("rejects a selected message belonging to another player", () => {
  assert.throws(() =>
    new QuizAnswerRanker().rank([message("message", "Alice", "21:00", 1)], [selected("Bob", "message")]),
  );
});
