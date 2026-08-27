import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { CurrentUser } from "../auth/domain/types";
import { LottoConductedOnUnavailableError } from "./errors";
import { LottoService } from "./LottoService";

const admin: CurrentUser = {
  id: "admin",
  login: "admin",
  displayName: "Administrator",
  role: "admin",
  projectProfiles: [],
};

function createService(current: Record<string, unknown>, submitted: unknown[]) {
  return new LottoService(
    {
      async findByIdAndProjectId() {
        return current;
      },
      async update(_gameId: string, _projectId: string, game: Record<string, unknown>) {
        return { ...game, _id: new ObjectId() };
      },
    } as never,
    { normalizeGame(game: unknown) { return game; } } as never,
    { create: (game: unknown) => game } as never,
    {} as never,
    {} as never,
    {} as never,
    { async deleteSourceFact() {}, async deleteProjectFacts() {} } as never,
    { async submitLottoGame(source: unknown) { submitted.push(source); } } as never,
  );
}

test("updates a finished Lotto conducted date, preserves a legacy finalization fallback, and re-submits Analytics", async () => {
  const current = {
    hostUserId: "host",
    status: "finished",
    updatedAt: "2026-08-25T10:00:00.000Z",
    finishedAt: null,
    conductedOn: null,
  };
  const submitted: unknown[] = [];
  const service = createService(current, submitted);

  const result = await service.updateLottoConductedOn(admin, "project", "game", "2024-03-15");

  assert.equal((result as unknown as { conductedOn: string }).conductedOn, "2024-03-15");
  assert.equal((result as unknown as { finishedAt: string }).finishedAt, "2026-08-25T10:00:00.000Z");
  assert.deepEqual(submitted, [result]);
});

test("rejects a Lotto conducted-date change before completion", async () => {
  const service = createService(
    { hostUserId: "host", status: "in_progress", updatedAt: "2026-08-25T10:00:00.000Z", finishedAt: null },
    [],
  );

  await assert.rejects(
    () => service.updateLottoConductedOn(admin, "project", "game", null),
    LottoConductedOnUnavailableError,
  );
});
