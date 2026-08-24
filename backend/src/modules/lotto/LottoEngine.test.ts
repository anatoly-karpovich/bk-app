import assert from "node:assert/strict";
import test from "node:test";
import { RewardGrantService } from "../rewards";
import { LottoPayoutDistributor } from "./domain/LottoPayoutDistributor";
import { LottoEngine } from "./LottoEngine";

const rules = {
  min: 1,
  max: 3,
  cardNumbersAmount: 2,
  firstPlacePrize: { mode: "all" as const, rewards: [] },
  secondPlacePrize: { mode: "all" as const, rewards: [] },
  otherActivePlayersPrize: { mode: "all" as const, rewards: [] },
  rewardDistributionMode: "full_per_winner" as const,
};

function engine() {
  return new LottoEngine(new RewardGrantService({ succeeds: () => true, pickWeightedIndex: () => 0 }), new LottoPayoutDistributor());
}

test("stores resolved Player references and hides them from Lotto player views", () => {
  const game = engine().createGame(
    [{ nickname: "Анатолий", playerRefId: "player-1", cardNumbers: [1, 2] }],
    { rules, resources: [] },
  );

  assert.equal(game.players[0].playerRefId, "player-1");
  assert.equal("playerRefId" in engine().getPlayerView(game.players[0], []), false);
});

test("rejects duplicate resolved Player references", () => {
  assert.throws(
    () =>
      engine().createGame(
        [
          { nickname: "Анатолий", playerRefId: "player-1", cardNumbers: [1, 2] },
          { nickname: "Борис", playerRefId: "player-1", cardNumbers: [2, 3] },
        ],
        { rules, resources: [] },
      ),
    /duplicate player reference/,
  );
});
