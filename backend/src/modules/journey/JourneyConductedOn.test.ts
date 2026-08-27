import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { CurrentUser } from "../auth/domain/types";
import { JourneyConductedOnUnavailableError } from "./errors";
import { JourneyService } from "./JourneyService";

const admin: CurrentUser = {
  id: "admin",
  login: "admin",
  displayName: "Administrator",
  role: "admin",
  projectProfiles: [],
};

const invalidator = { async deleteSourceFact() {}, async deleteProjectFacts() {} };

function createService(current: Record<string, unknown>, submitted: unknown[]) {
  return new JourneyService(
    {
      async findByIdAndProjectId() {
        return current;
      },
      async update(_gameId: string, _projectId: string, next: Record<string, unknown>) {
        return { ...next, _id: new ObjectId() };
      },
    } as never,
    {} as never,
    { create: (game: unknown) => game } as never,
    {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
    invalidator as never,
    { async submitJourneyGame(source: unknown) { submitted.push(source); } } as never,
  );
}

test("updates the conducted date of a finished Journey game and re-submits its Analytics fact", async () => {
  const current = {
    hostUserId: "host",
    updatedAt: "2026-08-25T10:00:00.000Z",
    conductedOn: null,
    stateV2: { status: "finished" },
  };
  const submitted: unknown[] = [];
  const service = createService(current, submitted);

  const result = await service.updateJourneyConductedOn(admin, "project", "game", "2024-03-15");

  assert.equal(current.conductedOn, null);
  assert.equal((result as unknown as { conductedOn: string }).conductedOn, "2024-03-15");
  assert.equal(submitted.length, 1);
  assert.equal((submitted[0] as { conductedOn: string }).conductedOn, "2024-03-15");
});

test("rejects a conducted-date change before Journey completion", async () => {
  const service = createService(
    { hostUserId: "host", updatedAt: "2026-08-25T10:00:00.000Z", stateV2: { status: "in_progress" } },
    [],
  );

  await assert.rejects(
    () => service.updateJourneyConductedOn(admin, "project", "game", null),
    JourneyConductedOnUnavailableError,
  );
});
