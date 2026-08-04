import assert from "node:assert/strict";
import test from "node:test";
import { ChatTransport } from "../../chat/domain/types";
import { QuizSelectedAnswerPruner } from "./QuizSelectedAnswerPruner";

test("retains only selections that still belong to their player in the effective chat", () => {
  const result = new QuizSelectedAnswerPruner().prune(
    [
      { playerName: "Alice", selectedMessageId: "alice" },
      { playerName: "Bob", selectedMessageId: "removed" },
      { playerName: "Cara", selectedMessageId: "alice" },
    ],
    [{
      id: "alice", from: "Alice", to: ["Dark"], text: "Answer", timestamp: "21:00",
      transport: ChatTransport.DIRECT, canonicalKey: "alice", sourceLineNumber: 1,
      effectiveOrder: 1,
    }],
  );

  assert.deepEqual(result, {
    selections: [{ playerName: "Alice", selectedMessageId: "alice" }],
    removedCount: 2,
  });
});
