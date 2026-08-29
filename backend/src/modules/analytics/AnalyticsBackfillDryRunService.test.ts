import assert from "node:assert/strict";
import test from "node:test";
import { AnalyticsBackfillDryRunService } from "./AnalyticsBackfillDryRunService";

test("reports validated in-memory facts by source, participant, partial warning, and resource category", async () => {
  const service = new AnalyticsBackfillDryRunService({
    async previewProject(projectId) {
      assert.equal(projectId, "project-a");
      return {
        factsBuilt: 2,
        facts: [
          {
            projectId,
            occurredAt: "2026-08-25T10:00:00.000Z",
            source: { kind: "game", type: "journey", id: "journey-1", revision: null, updatedAt: "2026-08-25T10:00:00.000Z" },
            participants: [
              {
                playerRefId: "player-1",
                nicknameSnapshot: "Player One",
                rewards: { regular: [{ resourceId: "ekr", amount: 10 }], bonus: [{ resourceId: "ekr", amount: 2 }] },
              },
            ],
            resourceSnapshot: [],
            meta: { status: "ready", issues: [], computedAt: "2026-08-25T10:01:00.000Z", schemaVersion: 1 },
          },
          {
            projectId,
            occurredAt: "2026-08-25T11:00:00.000Z",
            source: {
              kind: "quiz_event",
              type: "quiz",
              id: "event-1",
              quizId: "quiz-1",
              revision: 3,
              updatedAt: "2026-08-25T11:00:00.000Z",
            },
            participants: [
              {
                playerRefId: null,
                nicknameSnapshot: "Legacy",
                rewards: { regular: [{ resourceId: "chips", amount: 3 }], bonus: [{ resourceId: "ekr", amount: 1 }] },
              },
            ],
            resourceSnapshot: [],
            meta: {
              status: "partial",
              issues: [{ code: "missing_player_reference", nicknameSnapshot: "Legacy" }],
              computedAt: "2026-08-25T11:01:00.000Z",
              schemaVersion: 1,
            },
          },
        ],
      };
    },
  });

  const report = await service.inspectProject("project-a");

  assert.deepEqual(report.sourceCountsByType, {
    journey: 1,
    battleships: 0,
    lotto: 0,
    lotto_bingo: 0,
    quiz: 1,
    memes: 0,
    forum_quiz: 0,
    tournament: 0,
    forecast_contest: 0,
    contest: 0,
  });
  assert.equal(report.participations, 2);
  assert.deepEqual(report.partialFacts.map((fact) => fact.source.id), ["event-1"]);
  assert.deepEqual(report.rewardsByResource, [
    { resourceId: "chips", regular: 3, bonus: 0, total: 3 },
    { resourceId: "ekr", regular: 10, bonus: 3, total: 13 },
  ]);
});
