import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLottoRules } from "./config";
import type { LottoRulesInput } from "./types";

test("normalizes a legacy zero-value Lotto prize as an empty reward pool", () => {
  const input = {
    otherActivePlayersPrize: [{ currencyId: "default", value: 0 }],
  } as unknown as LottoRulesInput;
  const rules = normalizeLottoRules(input);

  assert.deepEqual(rules.otherActivePlayersPrize, { mode: "all", rewards: [] });
});
