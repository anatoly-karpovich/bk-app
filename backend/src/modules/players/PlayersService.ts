import { MongoServerError } from "mongodb";
import { assertProjectAccess } from "../auth/authorization";
import type { CurrentUser } from "../auth/domain/types";
import { ProjectNotFoundError } from "../projects/errors";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import { normalizePlayerNickname, toPlayerNicknameKey } from "./domain/normalizePlayerNickname";
import type { Player, PlayerAlias, PlayerView } from "./domain/types";
import { PlayerInUseError, PlayerNicknameConflictError, PlayerNicknameMismatchError, PlayerNotFoundError } from "./errors";
import { PlayerReadModelFactory } from "./PlayerReadModelFactory";
import { PlayerReferencesRepository } from "./PlayerReferencesRepository";
import { PlayersRepository } from "./PlayersRepository";

export interface PlayerReferenceInput {
  nickname: string;
  playerRefId?: string | null;
}

export interface ResolvedPlayerIdentity {
  nickname: string;
  playerRefId: string;
}

export class PlayersService {
  constructor(
    private readonly repository: PlayersRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly readModelFactory: PlayerReadModelFactory,
    private readonly referencesRepository: PlayerReferencesRepository,
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
    await this.assertNicknameAvailable(projectId, alias.key, nickname);

    const now = new Date().toISOString();
    const player: Player = {
      projectId,
      nickname,
      nicknameKey: alias.key,
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

  async resolveOrCreate(
    actor: CurrentUser,
    projectId: string,
    input: PlayerReferenceInput,
  ): Promise<ResolvedPlayerIdentity> {
    await this.assertProjectExistsAndAccessible(actor, projectId);
    const nickname = normalizePlayerNickname(input.nickname);
    const nicknameKey = toPlayerNicknameKey(nickname);

    if (input.playerRefId !== undefined && input.playerRefId !== null) {
      const player = await this.repository.findByIdAndProjectId(input.playerRefId, projectId);
      if (!player) throw new PlayerNotFoundError(projectId, input.playerRefId);
      if (player.nicknameKey !== nicknameKey) {
        throw new PlayerNicknameMismatchError(projectId, input.playerRefId, nickname);
      }
      return { nickname, playerRefId: player._id.toHexString() };
    }

    const existing = await this.repository.findByProjectIdAndNicknameKey(projectId, nicknameKey);
    if (existing) return { nickname, playerRefId: existing._id.toHexString() };

    try {
      const created = await this.create(actor, projectId, nickname);
      return { nickname, playerRefId: created.id };
    } catch (error) {
      if (!(error instanceof PlayerNicknameConflictError)) throw error;
      const concurrent = await this.repository.findByProjectIdAndNicknameKey(projectId, nicknameKey);
      if (!concurrent) throw error;
      return { nickname, playerRefId: concurrent._id.toHexString() };
    }
  }

  async update(actor: CurrentUser, projectId: string, playerId: string, nicknameInput: string): Promise<PlayerView> {
    await this.assertProjectExistsAndAccessible(actor, projectId);
    const current = await this.repository.findByIdAndProjectId(playerId, projectId);
    if (!current) throw new PlayerNotFoundError(projectId, playerId);

    const nickname = normalizePlayerNickname(nicknameInput);
    const alias = this.toAlias(nickname);
    const conflict = await this.repository.findByProjectIdAndNicknameKey(projectId, alias.key);
    if (conflict && conflict._id.toHexString() !== playerId) {
      throw new PlayerNicknameConflictError(projectId, nickname);
    }

    const aliases = current.aliases.some((existingAlias) => existingAlias.nickname === nickname)
      ? current.aliases
      : [...current.aliases, alias];
    const updated: Player = {
      projectId,
      nickname,
      nicknameKey: alias.key,
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

  async delete(actor: CurrentUser, projectId: string, playerId: string): Promise<void> {
    await this.assertProjectExistsAndAccessible(actor, projectId);
    const player = await this.repository.findByIdAndProjectId(playerId, projectId);
    if (!player) throw new PlayerNotFoundError(projectId, playerId);
    if (await this.referencesRepository.hasSavedGameReference(projectId, playerId, player.nickname))
      throw new PlayerInUseError(projectId, playerId);
    if (!(await this.repository.delete(playerId, projectId))) throw new PlayerNotFoundError(projectId, playerId);
  }

  private async assertProjectExistsAndAccessible(actor: CurrentUser, projectId: string): Promise<void> {
    assertProjectAccess(actor, projectId);
    if (!(await this.projectsRepository.findById(projectId))) throw new ProjectNotFoundError(projectId);
  }

  private async assertNicknameAvailable(projectId: string, nicknameKey: string, nickname: string): Promise<void> {
    if (await this.repository.findByProjectIdAndNicknameKey(projectId, nicknameKey)) {
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
