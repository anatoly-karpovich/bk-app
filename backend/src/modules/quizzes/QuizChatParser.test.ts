import assert from "node:assert/strict";
import test from "node:test";
import { QuizChatParser } from "./QuizChatParser";

const parser = new QuizChatParser();

test("parses every supported direct-message form with an exact host nickname", () => {
  const rows = [
    "[**Emrys**] to [Dark] ответ",
    "[**Emrys**] to [Dark, Почтальон] ответ",
    "[**Emrys**] to [Почтальон, Dark] ответ",
    "[**Emrys**] private [Dark] ответ",
    "[**Emrys**] private [Dark, Почтальон] ответ",
    "[**Emrys**] private [Почтальон, Dark] ответ",
  ];
  const parsed = parser.parse({ rawText: rows.join("\n"), hostNickname: "Dark" });

  assert.equal(parsed.length, 6);
  assert.ok(parsed.every((row) => row.playerName === "Emrys" && row.rawMessage === "ответ" && row.transport === "direct"));
});

test("keeps exact names and ignores a recipient containing the host nickname as a substring", () => {
  const parsed = parser.parse({ rawText: "23:53 [**Emrys**] to [Dark] ответ\n[**Emrys**] to [Darkness] не ответ", hostNickname: "Dark" });

  assert.deepEqual(parsed.map((row) => ({ playerName: row.playerName, rawMessage: row.rawMessage, sourceLineNumber: row.sourceLineNumber })), [
    { playerName: "Emrys", rawMessage: "ответ", sourceLineNumber: 1 },
  ]);
});

test("parses both clan markup forms and keeps the remaining text intact", () => {
  const parsed = parser.parse({
    rawText: "[**Братан**] private [**klan**] ответ\n[**ЧупаЗавр**] **private [** **klan** **]** to [J 0 K E R] ответ\n\nнеподдерживаемая строка",
    hostNickname: "Dark",
  });

  assert.deepEqual(parsed.map((row) => ({ playerName: row.playerName, rawMessage: row.rawMessage, transport: row.transport })), [
    { playerName: "Братан", rawMessage: "ответ", transport: "clan" },
    { playerName: "ЧупаЗавр", rawMessage: "to [J 0 K E R] ответ", transport: "clan" },
  ]);
});

test("uses a timestamp-free canonical key so duplicate rows from separate fragments can be deduplicated", () => {
  const [withTimestamp] = parser.parse({ rawText: "23:53 [**Emrys**] to [Dark] ответ", hostNickname: "Dark" });
  const [withoutTimestamp] = parser.parse({ rawText: "[**Emrys**] to [Dark] ответ", hostNickname: "Dark" });

  assert.equal(withTimestamp.canonicalKey, withoutTimestamp.canonicalKey);
});
