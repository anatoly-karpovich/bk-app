import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { CurrentUser } from "../auth/domain/types";
import { LottoBingoConductedOnUnavailableError } from "./errors";
import { LottoBingoService } from "./LottoBingoService";

const admin: CurrentUser = {
  id: "admin",
  login: "admin",
  displayName: "Administrator",
  role: "admin",
  projectProfiles: [],
};

function createService(current: Record<string, unknown>, submitted: unknown[], published: number[]) {
  return new LottoBingoService(
    {
      async findByIdAndProjectId() {
        return current;
      },
      async update(_gameId: string, _projectId: string, _expectedRevision: number, next: Record<string, unknown>) {
        return { ...next, _id: new ObjectId() };
      },
    } as never,
    {} as never,
    {
      create: (game: { conductedOn?: string | null; finishedAt: string | null; revision: number }) => ({
        meta: {
          conductedOn: game.conductedOn ?? null,
          finishedAt: game.finishedAt,
          revision: game.revision,
        },
      }),
    } as never,
    {} as never,
    { publish(_gameId: string, revision: number) { published.push(revision); } } as never,
    {} as never,
    {} as never,
    { async deleteSourceFact() {}, async deleteProjectFacts() {} } as never,
    { async submitLottoBingoGame(source: unknown) { submitted.push(source); } } as never,
  );
}

test("updates a finished Lotto Bingo conducted date with revision protection and re-submits Analytics", async () => {
  const current = {
    _id: new ObjectId(),
    hostUserId: "host",
    status: "finished",
    revision: 7,
    updatedAt: "2026-08-25T10:00:00.000Z",
    finishedAt: null,
    conductedOn: null,
  };
  const submitted: unknown[] = [];
  const published: number[] = [];
  const service = createService(current, submitted, published);

  const result = await service.updateConductedOn(admin, "project", "game", "2024-03-15", 7);

  assert.equal(result.meta.conductedOn, "2024-03-15");
  assert.equal(result.meta.finishedAt, "2026-08-25T10:00:00.000Z");
  assert.equal(result.meta.revision, 8);
  assert.equal((submitted[0] as { conductedOn: string }).conductedOn, "2024-03-15");
  assert.deepEqual(published, [8]);
});

test("rejects a Lotto Bingo conducted-date change before completion", async () => {
  const service = createService(
    { _id: new ObjectId(), hostUserId: "host", status: "in_progress", revision: 2, updatedAt: "2026-08-25T10:00:00.000Z" },
    [],
    [],
  );

  await assert.rejects(
    () => service.updateConductedOn(admin, "project", "game", null, 2),
    LottoBingoConductedOnUnavailableError,
  );
});

test("rejects a stale Lotto Bingo conducted-date revision", async () => {
  const service = createService(
    { _id: new ObjectId(), hostUserId: "host", status: "finished", revision: 2, updatedAt: "2026-08-25T10:00:00.000Z" },
    [],
    [],
  );

  await assert.rejects(
    () => service.updateConductedOn(admin, "project", "game", null, 1),
    (error: unknown) => (error as { code?: string }).code === "lotto_bingo_revision_conflict",
  );
});
