import assert from "node:assert/strict";
import test from "node:test";
import type { CurrentUser } from "../auth/domain/types";
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
  );

  await service.undoBattleshipsShot(admin, "project-a", "game-a");

  assert.deepEqual(invalidated, [{ projectId: "project-a", source: { kind: "game", id: "game-a" } }]);
});
