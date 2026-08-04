import assert from "node:assert/strict";
import test from "node:test";
import { ChatMessageIdentity } from "../chat/ChatMessageIdentity";
import { ChatTransport } from "../chat/domain/types";
import { QuizMessageCandidateFilter } from "./QuizMessageCandidateFilter";

const filter = new QuizMessageCandidateFilter(new ChatMessageIdentity());

test("filters only exact host recipients or enabled clan messages and excludes host messages", () => {
  const result = filter.filter([
    { from: "Alice", to: ["Dark"], text: "yes", timestamp: "21:00", sourceLineNumber: 1 },
    { from: "Alice", to: ["Darkness"], text: "no", timestamp: "21:01", sourceLineNumber: 2 },
    { from: "Dark", to: ["Dark"], text: "host", timestamp: "21:02", sourceLineNumber: 3 },
    { from: "Bob", to: ["klan"], text: "clan", timestamp: "21:03", sourceLineNumber: 4 },
  ], { hostNickname: "Dark", allowedTransports: [ChatTransport.DIRECT, ChatTransport.CLAN] });
  assert.deepEqual(result.map((message) => [message.from, message.transport]), [["Alice", ChatTransport.DIRECT], ["Bob", ChatTransport.CLAN]]);
});
