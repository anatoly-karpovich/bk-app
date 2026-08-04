import assert from "node:assert/strict";
import test from "node:test";
import { ChatMessageIdentity } from "../../chat/ChatMessageIdentity";
import { ChatTransport } from "../../chat/domain/types";
import { ChatMessageDeduplicator } from "./ChatMessageDeduplicator";
import type { QuizChatMessageCandidate } from "../domain/types";

const identity = new ChatMessageIdentity();
const candidate = (text: string): QuizChatMessageCandidate => ({
  from: "Alice",
  to: ["Dark"],
  text,
  timestamp: "21:00",
  sourceLineNumber: 1,
  transport: ChatTransport.DIRECT,
  canonicalKey: identity.createKey({ from: "Alice", to: ["Dark"], text, timestamp: "21:00" }),
});

test("deduplicates against existing messages and within one incoming fragment", () => {
  const existing = [{ ...candidate("old"), id: "old", firstSeenFragmentId: "fragment", firstSeenOrder: 1 }];
  const result = new ChatMessageDeduplicator(identity).deduplicate(existing, [
    candidate("old"),
    candidate("new"),
    candidate("new"),
  ]);
  assert.deepEqual(
    result.unique.map((item) => item.text),
    ["new"],
  );
  assert.equal(result.duplicatesCount, 2);
});

test("preserves source order and treats changed timestamps or recipients as unique", () => {
  const deduplicator = new ChatMessageDeduplicator(identity);
  const changedTime = {
    ...candidate("answer"),
    timestamp: "21:01",
    canonicalKey: identity.createKey({ from: "Alice", to: ["Dark"], text: "answer", timestamp: "21:01" }),
  };
  const changedRecipient = {
    ...candidate("answer"),
    to: ["Helper"],
    canonicalKey: identity.createKey({ from: "Alice", to: ["Helper"], text: "answer", timestamp: "21:00" }),
  };
  const result = deduplicator.deduplicate([], [candidate("first"), candidate("first"), changedTime, changedRecipient]);
  assert.deepEqual(
    result.unique.map((item) => [item.text, item.timestamp, item.to]),
    [
      ["first", "21:00", ["Dark"]],
      ["answer", "21:01", ["Dark"]],
      ["answer", "21:00", ["Helper"]],
    ],
  );
  assert.equal(result.duplicatesCount, 1);
});
