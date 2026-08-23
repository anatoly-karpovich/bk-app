import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId, type WithId } from "mongodb";
import type { CurrentUser } from "../auth/domain/types";
import { PlayerInUseError, PlayerNicknameConflictError, PlayerNicknameMismatchError, PlayerNotFoundError } from "./errors";
import { PlayerReadModelFactory } from "./PlayerReadModelFactory";
import { PlayerReferencesRepository } from "./PlayerReferencesRepository";
import { PlayersRepository } from "./PlayersRepository";
import { PlayersService } from "./PlayersService";
import type { Player } from "./domain/types";
import { ProjectsRepository } from "../projects/ProjectsRepository";

const actor: CurrentUser = {
  id: "admin",
  login: "admin",
  displayName: "Administrator",
  role: "admin",
  projectProfiles: [],
};

function createService(playerIsReferenced = false) {
  const players: Array<WithId<Player>> = [];
  const repository = {
    async findByProjectId(projectId: string) {
      return players.filter((player) => player.projectId === projectId);
    },
    async findByIdAndProjectId(playerId: string, projectId: string) {
      return players.find((player) => player._id.toHexString() === playerId && player.projectId === projectId) ?? null;
    },
    async findByProjectIdAndNicknameKey(projectId: string, nicknameKey: string) {
      return players.find((player) => player.projectId === projectId && player.nicknameKey === nicknameKey) ?? null;
    },
    async create(player: Player) {
      const created = { _id: new ObjectId(), ...player };
      players.push(created);
      return created;
    },
    async update(playerId: string, projectId: string, player: Player) {
      const index = players.findIndex((candidate) => candidate._id.toHexString() === playerId && candidate.projectId === projectId);
      if (index < 0) return null;
      players[index] = { _id: players[index]._id, ...player };
      return players[index];
    },
    async delete(playerId: string, projectId: string) {
      const index = players.findIndex((candidate) => candidate._id.toHexString() === playerId && candidate.projectId === projectId);
      if (index < 0) return false;
      players.splice(index, 1);
      return true;
    },
  };
  const projectsRepository = {
    async findById(projectId: string) {
      return projectId === "project" ? { _id: new ObjectId(), code: "project" } : null;
    },
  };

  return new PlayersService(
    repository as unknown as PlayersRepository,
    projectsRepository as unknown as ProjectsRepository,
    new PlayerReadModelFactory(),
    { async hasSavedGameReference() { return playerIsReferenced; } } as unknown as PlayerReferencesRepository,
  );
}

test("retains every nickname as an alias when a project player is renamed", async () => {
  const service = createService();
  const created = await service.create(actor, "project", "  Старый Ник  ");
  const updated = await service.update(actor, "project", created.id, "Новый Ник");

  assert.equal(updated.content.nickname, "Новый Ник");
  assert.deepEqual(updated.content.aliases, ["Старый Ник", "Новый Ник"]);
});

test("allows a new player to use a nickname that a different player used in the past", async () => {
  const service = createService();
  const created = await service.create(actor, "project", "Старый Ник");
  await service.update(actor, "project", created.id, "Новый Ник");

  const replacement = await service.create(actor, "project", "старый ник");
  assert.equal(replacement.content.nickname, "старый ник");
});

test("does not let two current players share a nickname in the same project", async () => {
  const service = createService();
  await service.create(actor, "project", "Текущий Ник");

  await assert.rejects(
    service.create(actor, "project", "текущий ник"),
    (error: unknown) => error instanceof PlayerNicknameConflictError,
  );
});

test("resolves a player by current nickname when the client provides no reference", async () => {
  const service = createService();
  const created = await service.create(actor, "project", "Текущий Ник");

  const resolved = await service.resolveOrCreate(actor, "project", { nickname: "текущий ник", playerRefId: null });

  assert.equal(resolved.playerRefId, created.id);
  assert.equal(resolved.nickname, "текущий ник");
});

test("creates a player instead of resolving another player's historical alias", async () => {
  const service = createService();
  const original = await service.create(actor, "project", "Старый Ник");
  await service.update(actor, "project", original.id, "Новый Ник");

  const resolved = await service.resolveOrCreate(actor, "project", { nickname: "старый ник" });

  assert.notEqual(resolved.playerRefId, original.id);
  assert.equal(resolved.nickname, "старый ник");
});

test("rejects an explicit Player reference paired with a different current nickname", async () => {
  const service = createService();
  const created = await service.create(actor, "project", "Текущий Ник");

  await assert.rejects(
    service.resolveOrCreate(actor, "project", { nickname: "Другой Ник", playerRefId: created.id }),
    (error: unknown) => error instanceof PlayerNicknameMismatchError,
  );
});

test("deletes a Player that has no saved-game references", async () => {
  const service = createService();
  const created = await service.create(actor, "project", "Удаляемый");

  await service.delete(actor, "project", created.id);

  await assert.rejects(
    service.getById(actor, "project", created.id),
    (error: unknown) => error instanceof PlayerNotFoundError,
  );
});

test("does not delete a Player used by a saved game", async () => {
  const service = createService(true);
  const created = await service.create(actor, "project", "Занятый");

  await assert.rejects(
    service.delete(actor, "project", created.id),
    (error: unknown) => error instanceof PlayerInUseError,
  );
});
