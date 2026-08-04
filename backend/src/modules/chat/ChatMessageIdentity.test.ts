import assert from "node:assert/strict";
import test from "node:test";
import { ChatMessageIdentity } from "./ChatMessageIdentity";

test("creates stable identities without mutating recipient order", () => {
  const identity = new ChatMessageIdentity();
  const recipients = ["Dark", "Helper"];
  const first = identity.createKey({ from: "Alice", to: recipients, text: "Минск", timestamp: "21:05" });
  const second = identity.createKey({ from: "Alice", to: ["Helper", "Dark"], text: "Минск", timestamp: "21:05" });
  assert.equal(first, second);
  assert.deepEqual(recipients, ["Dark", "Helper"]);
});
