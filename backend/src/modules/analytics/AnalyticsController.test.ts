import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { AnalyticsController } from "./AnalyticsController";
import { AnalyticsReadModelFactory } from "./AnalyticsReadModelFactory";

const actor = {
  id: "host",
  login: "host",
  displayName: "Host",
  role: "host" as const,
  projectProfiles: [{ projectId: "64b64c6f0d7f6f0000000001", nickname: "Host" }],
};

function response() {
  const state = { statusCode: 0, body: undefined as unknown };
  const res = {
    status: (statusCode: number) => {
      state.statusCode = statusCode;
      return res;
    },
    json: (body: unknown) => {
      state.body = body;
      return res;
    },
  };
  return { res: res as unknown as Response, state };
}

function request(query: unknown = {}): Request {
  return {
    authUser: actor,
    params: { projectId: "64b64c6f0d7f6f0000000001" },
    query,
  } as unknown as Request;
}

test("returns source-level integrity diagnostics but hides internal source player ids", async () => {
  const controller = new AnalyticsController(
    {
      async getStatus() {
        return {
          freshness: "stale" as const,
          sourceCountsByType: { journey: 1, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 },
          factCountsByType: { journey: 1, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 },
          missing: [],
          orphan: [],
          outdated: [],
          partialFacts: [
            {
              source: {
                kind: "game" as const,
                type: "journey" as const,
                id: "game-a",
                revision: null,
                updatedAt: "2026-08-01T00:00:00.000Z",
              },
              issues: [{ code: "missing_player_reference" as const, sourcePlayerId: "internal-player-id", nicknameSnapshot: "Legacy" }],
            },
          ],
        };
      },
    } as never,
    new AnalyticsReadModelFactory(),
  );
  const { res, state } = response();

  await controller.getStatus(request(), res);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, {
    success: true,
    data: {
      freshness: "stale",
      sourceCountsByType: { journey: 1, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 },
      factCountsByType: { journey: 1, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 },
      missing: [],
      orphan: [],
      outdated: [],
      partialFacts: [
        {
          source: {
            kind: "game",
            type: "journey",
            id: "game-a",
            revision: null,
            updatedAt: "2026-08-01T00:00:00.000Z",
          },
          issues: [{ code: "missing_player_reference", nicknameSnapshot: "Legacy" }],
        },
      ],
    },
  });
});

test("accepts comma-separated source types and a numeric leaderboard limit", async () => {
  let receivedQuery: unknown;
  const controller = new AnalyticsController(
    {
      async getPlayerLeaderboard(_actor: unknown, _projectId: string, query: unknown) {
        receivedQuery = query;
        return {
          period: { from: "2026-08-01T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z", sourceTypes: ["journey", "lotto"] },
          resource: { resource: { id: "coins", code: "coins", name: "Coins", label: "coins", type: "currency", valueType: "integer", precision: 0 }, catalogStatus: "current" as const },
          players: [],
          nextCursor: null,
          integrity: { freshness: "fresh", sourceCountsByType: { journey: 0, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 }, factCountsByType: { journey: 0, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 }, missing: [], orphan: [], outdated: [], partialFacts: [] },
        };
      },
    } as never,
    new AnalyticsReadModelFactory(),
  );
  const { res, state } = response();

  await controller.getPlayerLeaderboard(request({ sourceTypes: "journey,lotto", limit: "10" }), res);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(receivedQuery, { sourceTypes: ["journey", "lotto"], limit: 10 });
});
