import assert from "node:assert/strict";
import test from "node:test";
import { ChatParser } from "./ChatParser";

const parser = new ChatParser();

test("parses supported direct and clan messages without quiz context", () => {
  const messages = parser.parse("23:53 [**Emrys**] to [Dark, Почтальон] Минск\n[PlainPlayer] private [Dark] ответ\n[**Братан**] private [**klan**] ответ\n[**ЧупаЗавр**] **private [** **klan** **]** to [J 0 K E R] ответ");
  assert.deepEqual(messages, [
    { from: "Emrys", to: ["Dark", "Почтальон"], text: "Минск", timestamp: "23:53", sourceLineNumber: 1 },
    { from: "PlainPlayer", to: ["Dark"], text: "ответ", timestamp: null, sourceLineNumber: 2 },
    { from: "Братан", to: ["klan"], text: "ответ", timestamp: null, sourceLineNumber: 3 },
    { from: "ЧупаЗавр", to: ["klan"], text: "to [J 0 K E R] ответ", timestamp: null, sourceLineNumber: 4 },
  ]);
});

test("preserves duplicate messages and source lines", () => {
  const messages = parser.parse("[Player] private [Dark] ответ\r\n\r\n[Player] private [Dark] ответ");
  assert.equal(messages.length, 2);
  assert.deepEqual(messages.map((message) => message.sourceLineNumber), [1, 3]);
});

test("keeps long public messages separate when clipboard timestamps are missing or damaged", () => {
  const announcement = "завершён розыгрыш Лотереи Удачи среди тех, кто делает покупки в игре! ".repeat(20) + "Победители: Спаркичъ — 100 ваучеров [4]";
  const second = "Никогда нету архов";
  const prefixes = [
    { prefix: "13:49 ", timestamp: "13:49" },
    { prefix: " ", timestamp: null },
    { prefix: ":49 ", timestamp: null },
    { prefix: "3:49 ", timestamp: "03:49" },
    { prefix: "9 ", timestamp: null },
  ];

  for (const { prefix, timestamp } of prefixes) {
    const messages = parser.parse(`${prefix}[**StormBetter**] , ${announcement}\n13:50 [**StormBetter**] ${second}`);
    assert.equal(messages.length, 2, `prefix ${JSON.stringify(prefix)}`);
    assert.deepEqual(messages.map((message) => [message.from, message.to, message.text, message.timestamp]), [
      ["StormBetter", [], announcement, timestamp],
      ["StormBetter", [], second, "13:50"],
    ]);
  }
});
