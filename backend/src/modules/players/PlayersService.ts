import { MongoServerError } from "mongodb";
import { assertProjectAccess } from "../auth/authorization";
import type { CurrentUser } from "../auth/domain/types";
import { ProjectNotFoundError } from "../projects/errors";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import { normalizePlayerNickname, toPlayerNicknameKey } from "./domain/normalizePlayerNickname";
import type { Player, PlayerAlias, PlayerView } from "./domain/types";
import { PlayerNicknameConflictError, PlayerNotFoundError } from "./errors";
import { PlayerReadModelFactory } from "./PlayerReadModelFactory";
import { PlayersRepository } from "./PlayersRepository";

export class PlayersService {
  constructor(
    private readonly repository: PlayersRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly readModelFactory: PlayerReadModelFactory,
  ) {}

  async getAll(actor: CurrentUser, projectId: string): Promise<PlayerView[]> {
    await this.assertProjectExistsAndAccessible(actor, projectId);
    const players = await this.repository.findByProjectId(projectId);
    return players
      .map((player) => this.readModelFactory.create(player))
      .sort((left, right) => left.content.nickname.localeCompare(right.content.nickname, "ru"));
  }

  async getById(actor: CurrentUser, projectId: string, playerId: string): Promise<PlayerView> {
    await this.assertProjectExistsAndAccessible(actor, projectId);
    const player = await this.repository.findByIdAndProjectId(playerId, projectId);
    if (!player) throw new PlayerNotFoundError(projectId, playerId);
    return this.readModelFactory.create(player);
  }

  async create(actor: CurrentUser, projectId: string, nicknameInput: string): Promise<PlayerView> {
    await this.assertProjectExistsAndAccessible(actor, projectId);
    const nickname = normalizePlayerNickname(nicknameInput);
    const alias = this.toAlias(nickname);
    await this.assertAliasAvailable(projectId, alias.key, nickname);

    const now = new Date().toISOString();
    const player: Player = {
      projectId,
      nickname,
      aliases: [alias],
      createdAt: now,
      updatedAt: now,
    };

    try {
      return this.readModelFactory.create(await this.repository.create(player));
    } catch (error) {
      this.rethrowDuplicateNickname(error, projectId, nickname);
      throw error;
    }
  }

  async update(actor: CurrentUser, projectId: string, playerId: string, nicknameInput: string): Promise<PlayerView> {
    await this.assertProjectExistsAndAccessible(actor, projectId);
    const current = await this.repository.findByIdAndProjectId(playerId, projectId);
    if (!current) throw new PlayerNotFoundError(projectId, playerId);

    const nickname = normalizePlayerNickname(nicknameInput);
    const alias = this.toAlias(nickname);
    const conflict = await this.repository.findByProjectIdAndAliasKey(projectId, alias.key);
    if (conflict && conflict._id.toHexString() !== playerId) {
      throw new PlayerNicknameConflictError(projectId, nickname);
    }

    const aliases = current.aliases.some((existingAlias) => existingAlias.nickname === nickname)
      ? current.aliases
      : [...current.aliases, alias];
    const updated: Player = {
      projectId,
      nickname,
      aliases,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = await this.repository.update(playerId, projectId, updated);
      if (!saved) throw new PlayerNotFoundError(projectId, playerId);
      return this.readModelFactory.create(saved);
    } catch (error) {
      this.rethrowDuplicateNickname(error, projectId, nickname);
      throw error;
    }
  }

  private async assertProjectExistsAndAccessible(actor: CurrentUser, projectId: string): Promise<void> {
    assertProjectAccess(actor, projectId);
    if (!(await this.projectsRepository.findById(projectId))) throw new ProjectNotFoundError(projectId);
  }

  private async assertAliasAvailable(projectId: string, aliasKey: string, nickname: string): Promise<void> {
    if (await this.repository.findByProjectIdAndAliasKey(projectId, aliasKey)) {
      throw new PlayerNicknameConflictError(projectId, nickname);
    }
  }

  private rethrowDuplicateNickname(error: unknown, projectId: string, nickname: string): void {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new PlayerNicknameConflictError(projectId, nickname);
    }
  }

  private toAlias(nickname: string): PlayerAlias {
    return { nickname, key: toPlayerNicknameKey(nickname) };
  }
}
