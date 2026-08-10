import assert from "node:assert/strict";
import test from "node:test";
import { ChatTransport } from "./domain/types";
import { ChatMessageIdentity } from "./ChatMessageIdentity";

test("creates stable identities without mutating recipient order", () => {
  const identity = new ChatMessageIdentity();
  const recipients = ["Dark", "Helper"];
  const first = identity.createKey({
    from: " Alice ",
    to: recipients,
    text: " Минск ",
    timestamp: "21:05",
    transport: ChatTransport.DIRECT,
  });
  const second = identity.createKey({
    from: "Alice",
    to: ["Helper", "Dark", "Dark"],
    text: "Минск",
    timestamp: "21:05",
    transport: ChatTransport.DIRECT,
  });
  assert.equal(first, second);
  assert.deepEqual(recipients, ["Dark", "Helper"]);
});

test("keeps distinct sender, text, punctuation, case, and timestamp identities", () => {
  const identity = new ChatMessageIdentity();
  const base = { from: "Alice", to: ["Dark"], text: "Минск", timestamp: "21:05", transport: ChatTransport.DIRECT };
  const key = identity.createKey(base);
  assert.notEqual(key, identity.createKey({ ...base, from: "alice" }));
  assert.notEqual(key, identity.createKey({ ...base, text: "Минск!" }));
  assert.notEqual(key, identity.createKey({ ...base, text: "минск" }));
  assert.notEqual(key, identity.createKey({ ...base, timestamp: "21:06" }));
  assert.notEqual(key, identity.createKey({ ...base, transport: ChatTransport.CLAN }));
});
