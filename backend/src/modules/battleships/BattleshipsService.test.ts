import assert from "node:assert/strict";
import test from "node:test";
import type { CurrentUser } from "../auth/domain/types";
import { BattleshipsConductedOnUnavailableError } from "./errors";
import { BattleshipsService } from "./BattleshipsService";

const admin: CurrentUser = {
  id: "admin",
  login: "admin",
  displayName: "Administrator",
  role: "admin",
  projectProfiles: [],
};

test("invalidates an analytics fact only after a finished Battleships game is saved as in progress", async () => {
  const current = { status: "finished", hostUserId: "host" };
  const next = { status: "in_progress", hostUserId: "host" };
  const invalidated: unknown[] = [];
  const service = new BattleshipsService(
    {
      async findByIdAndProjectId() {
        return current;
      },
      async update() {
        return next;
      },
    } as never,
    {
      undoLastShot() {
        return next;
      },
      normalizeGame(game: unknown) {
        return game;
      },
    } as never,
    { create: () => ({ id: "game-a" }) } as never,
    {} as never,
    {} as never,
    {} as never,
    {
      async deleteSourceFact(projectId: string, source: unknown) {
        invalidated.push({ projectId, source });
      },
      async deleteProjectFacts() {},
    },
    { async submitActivityResult() {}, async submitJourneyGame() {}, async submitBattleshipsGame() {}, async submitLottoGame() {}, async submitLottoBingoGame() {}, async submitQuizEvent() {} },
  );

  await service.undoBattleshipsShot(admin, "project-a", "game-a");

  assert.deepEqual(invalidated, [{ projectId: "project-a", source: { kind: "game", id: "game-a" } }]);
});

test("updates a finished Battleships conducted date, preserves a legacy finalization fallback, and re-submits Analytics", async () => {
  const current = {
    status: "finished",
    hostUserId: "host",
    updatedAt: "2026-08-25T10:00:00.000Z",
    finishedAt: undefined,
    conductedOn: null,
  };
  const submitted: unknown[] = [];
  const service = new BattleshipsService(
    {
      async findByIdAndProjectId() {
        return current;
      },
      async update(_gameId: string, _projectId: string, game: unknown) {
        return game;
      },
    } as never,
    { normalizeGame(game: unknown) { return game; } } as never,
    { create: (game: unknown) => game } as never,
    {} as never,
    {} as never,
    {} as never,
    { async deleteSourceFact() {}, async deleteProjectFacts() {} } as never,
    {
      async submitActivityResult() {},
      async submitJourneyGame() {},
      async submitBattleshipsGame(source: unknown) { submitted.push(source); },
      async submitLottoGame() {},
      async submitLottoBingoGame() {},
      async submitQuizEvent() {},
    },
  );

  const result = await service.updateBattleshipsConductedOn(admin, "project-a", "game-a", "2024-03-15");

  assert.equal((result as unknown as { conductedOn: string }).conductedOn, "2024-03-15");
  assert.equal((result as unknown as { finishedAt: string }).finishedAt, "2026-08-25T10:00:00.000Z");
  assert.deepEqual(submitted, [result]);
});

test("rejects a Battleships conducted-date change before completion", async () => {
  const service = new BattleshipsService(
    { async findByIdAndProjectId() { return { status: "in_progress", hostUserId: "host" }; } } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  await assert.rejects(
    () => service.updateBattleshipsConductedOn(admin, "project-a", "game-a", null),
    BattleshipsConductedOnUnavailableError,
  );
});
