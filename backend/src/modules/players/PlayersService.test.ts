import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId, type WithId } from "mongodb";
import type { CurrentUser } from "../auth/domain/types";
import { PlayerNicknameConflictError } from "./errors";
import { PlayerReadModelFactory } from "./PlayerReadModelFactory";
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

function createService() {
  const players: Array<WithId<Player>> = [];
  const repository = {
    async findByProjectId(projectId: string) {
      return players.filter((player) => player.projectId === projectId);
    },
    async findByIdAndProjectId(playerId: string, projectId: string) {
      return players.find((player) => player._id.toHexString() === playerId && player.projectId === projectId) ?? null;
    },
    async findByProjectIdAndAliasKey(projectId: string, aliasKey: string) {
      return players.find((player) => player.projectId === projectId && player.aliases.some((alias) => alias.key === aliasKey)) ?? null;
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
  );
}

test("retains every nickname as an alias when a project player is renamed", async () => {
  const service = createService();
  const created = await service.create(actor, "project", "  Старый Ник  ");
  const updated = await service.update(actor, "project", created.id, "Новый Ник");

  assert.equal(updated.content.nickname, "Новый Ник");
  assert.deepEqual(updated.content.aliases, ["Старый Ник", "Новый Ник"]);
});

test("does not let another player claim an existing alias in the same project", async () => {
  const service = createService();
  const created = await service.create(actor, "project", "Старый Ник");
  await service.update(actor, "project", created.id, "Новый Ник");

  await assert.rejects(
    service.create(actor, "project", "старый ник"),
    (error: unknown) => error instanceof PlayerNicknameConflictError,
  );
});
