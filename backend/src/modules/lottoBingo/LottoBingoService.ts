import type { ClientSession } from "mongodb";
import { AppError } from "../../common/errors";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import { assertOwnedByUser, assertProjectAccess, getHostSnapshot } from "../auth/authorization";
import type { CurrentUser } from "../auth/domain/types";
import type { GameConfigsService } from "../gameConfigs/GameConfigsService";
import { PlayersService, type PlayerReferenceInput } from "../players/PlayersService";
import { collectResourceIdsFromRules } from "../gameConfigs/domain/resourceReferences";
import { LottoBingoEngine } from "./LottoBingoEngine";
import { LottoBingoReadModelFactory } from "./LottoBingoReadModelFactory";
import { LottoBingoRepository, type LottoBingoGameDocument } from "./LottoBingoRepository";
import { LottoBingoUpdatePublisher, type LottoBingoUpdatedEvent } from "./LottoBingoUpdatePublisher";
import type { LottoBingoGameListItemView, LottoBingoGameView } from "./domain/types";
import type { AnalyticsProjectionInvalidator } from "../analytics/AnalyticsProjectionInvalidator";
import type { AnalyticsProjectionSubmitter } from "../analytics/AnalyticsProjectionSubmitter";
import { LottoBingoConductedOnUnavailableError } from "./errors";

export class LottoBingoService {
  constructor(
    private readonly repository: LottoBingoRepository,
    private readonly engine: LottoBingoEngine,
    private readonly readModels: LottoBingoReadModelFactory,
    private readonly gameConfigs: GameConfigsService,
    private readonly updates: LottoBingoUpdatePublisher,
    private readonly players: PlayersService,
    private readonly mongoDatabase: MongoDatabase,
    private readonly analyticsInvalidator: AnalyticsProjectionInvalidator,
    private readonly analyticsSubmitter: AnalyticsProjectionSubmitter,
  ) {}

  async createGame(actor: CurrentUser, projectId: string, gameConfigId: string): Promise<LottoBingoGameView> {
    const host = this.actorSnapshot(actor, projectId);
    const context = await this.gameConfigs.getLottoBingoGameConfigContext(projectId, gameConfigId);
    const resourceIds = collectResourceIdsFromRules(context.config.rules);
    const created = await this.repository.create(
      this.engine.createGame({
        projectId,
        configId: gameConfigId,
        configName: context.config.name,
        hostUserId: actor.id,
        hostSnapshot: host,
        rules: context.config.rules,
        resources: context.projectResources.filter((resource) => resourceIds.has(resource.id)),
      }),
    );
    if (!created)
      throw new AppError("Failed to create Lotto Bingo game", { statusCode: 500, code: "lotto_bingo_create_failed" });
    return this.readModels.create(created, actor);
  }
  async listGames(actor: CurrentUser, projectId: string): Promise<LottoBingoGameListItemView[]> {
    assertProjectAccess(actor, projectId);
    return (await this.repository.findByProjectId(projectId)).map((game) => this.readModels.createListItem(game));
  }
  async getGame(actor: CurrentUser, projectId: string, gameId: string): Promise<LottoBingoGameView> {
    assertProjectAccess(actor, projectId);
    return this.readModels.create(await this.requireGame(projectId, gameId), actor);
  }
  async getLatestGame(actor: CurrentUser, projectId: string): Promise<LottoBingoGameView> {
    assertProjectAccess(actor, projectId);
    const game = await this.repository.findLatest(projectId);
    if (!game)
      throw new AppError("No unfinished Lotto Bingo games found", {
        statusCode: 404,
        code: "lotto_bingo_games_not_found",
      });
    return this.readModels.create(game, actor);
  }
  async addPlayer(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    participant: PlayerReferenceInput,
    expectedRevision: number,
  ) {
    const updated = await this.mongoDatabase.withTransaction(async (session) => {
      assertProjectAccess(actor, projectId);
      const current = await this.requireGame(projectId, gameId, session);
      assertOwnedByUser(actor, current.hostUserId);
      if (current.revision !== expectedRevision) this.throwRevisionConflict();
      const player = await this.players.resolveOrCreate(actor, projectId, participant, session);
      const next = this.engine.addPlayer(current, player, this.actorSnapshot(actor, projectId));
      const saved = await this.repository.update(gameId, projectId, expectedRevision, next, session);
      if (!saved) this.throwRevisionConflict();
      return saved;
    });
    this.updates.publish(gameId, updated.revision);
    return this.readModels.create(updated, actor);
  }
  async removePlayer(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    playerId: string,
    expectedRevision: number,
  ) {
    return this.mutate(actor, projectId, gameId, expectedRevision, (game, host) =>
      this.engine.removePlayer(game, playerId, host),
    );
  }
  async startGame(actor: CurrentUser, projectId: string, gameId: string, expectedRevision: number) {
    return this.mutate(actor, projectId, gameId, expectedRevision, (game, host) => this.engine.startGame(game, host));
  }
  async drawBarrel(actor: CurrentUser, projectId: string, gameId: string, expectedRevision: number) {
    return this.mutate(actor, projectId, gameId, expectedRevision, (game, host) => this.engine.drawBarrel(game, host));
  }
  async undoDraw(actor: CurrentUser, projectId: string, gameId: string, expectedRevision: number) {
    return this.mutate(actor, projectId, gameId, expectedRevision, (game, host) =>
      this.engine.undoLastDraw(game, host),
    );
  }
  async confirmWinners(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    playerIds: string[],
    expectedRevision: number,
  ) {
    return this.mutate(actor, projectId, gameId, expectedRevision, (game, host) =>
      this.engine.confirmWinners(game, playerIds, host),
    );
  }
  async disqualifyPlayer(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    playerId: string,
    expectedRevision: number,
  ) {
    return this.mutate(actor, projectId, gameId, expectedRevision, (game, host) =>
      this.engine.disqualifyPlayer(game, playerId, host),
    );
  }
  async restorePlayer(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    playerId: string,
    expectedRevision: number,
  ) {
    return this.mutate(actor, projectId, gameId, expectedRevision, (game, host) =>
      this.engine.restorePlayer(game, playerId, host),
    );
  }
  async finalizeGame(actor: CurrentUser, projectId: string, gameId: string, expectedRevision: number) {
    return this.mutate(actor, projectId, gameId, expectedRevision, (game, host) =>
      this.engine.finalizeGame(game, host),
    );
  }
  async updateConductedOn(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    conductedOn: string | null,
    expectedRevision: number,
  ): Promise<LottoBingoGameView> {
    assertProjectAccess(actor, projectId);
    const current = await this.requireGame(projectId, gameId);
    assertOwnedByUser(actor, current.hostUserId);
    if (current.status !== "finished") throw new LottoBingoConductedOnUnavailableError();
    if (current.revision !== expectedRevision) this.throwRevisionConflict();

    const updated = await this.repository.update(gameId, projectId, expectedRevision, {
      ...current,
      // Preserve the historical fallback before changing updatedAt, so clearing the explicit date is stable.
      finishedAt: current.finishedAt ?? current.updatedAt,
      conductedOn,
      updatedAt: new Date().toISOString(),
      revision: current.revision + 1,
    });
    if (!updated) this.throwRevisionConflict();

    await this.analyticsSubmitter.submitLottoBingoGame(updated);
    this.updates.publish(gameId, updated.revision);
    return this.readModels.create(updated, actor);
  }
  async deleteGame(actor: CurrentUser, projectId: string, gameId: string, expectedRevision: number): Promise<void> {
    const game = await this.requireGame(projectId, gameId);
    assertProjectAccess(actor, projectId);
    assertOwnedByUser(actor, game.hostUserId);
    if (game.revision !== expectedRevision || !(await this.repository.delete(gameId, projectId, expectedRevision)))
      throw new AppError("Lotto Bingo game was changed by another operation", {
        statusCode: 409,
        code: "lotto_bingo_revision_conflict",
      });
    await this.analyticsInvalidator.deleteSourceFact(projectId, { kind: "game", id: gameId });
  }
  async subscribe(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    listener: (event: LottoBingoUpdatedEvent) => void,
  ): Promise<() => void> {
    assertProjectAccess(actor, projectId);
    await this.requireGame(projectId, gameId);
    return this.updates.subscribe(gameId, listener);
  }

  private async mutate(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    expectedRevision: number,
    operation: (
      game: LottoBingoGameDocument,
      host: ReturnType<typeof getHostSnapshot>,
    ) => LottoBingoGameDocument | Promise<LottoBingoGameDocument>,
  ): Promise<LottoBingoGameView> {
    assertProjectAccess(actor, projectId);
    const current = await this.requireGame(projectId, gameId);
    assertOwnedByUser(actor, current.hostUserId);
    if (current.revision !== expectedRevision) this.throwRevisionConflict();
    const next = await operation(current, this.actorSnapshot(actor, projectId));
    const updated = await this.repository.update(gameId, projectId, expectedRevision, next);
    if (!updated) this.throwRevisionConflict();
    if (current.status !== "finished" && updated.status === "finished") {
      await this.analyticsSubmitter.submitLottoBingoGame(updated);
    }
    this.updates.publish(gameId, updated.revision);
    return this.readModels.create(updated, actor);
  }
  private actorSnapshot(actor: CurrentUser, projectId: string): ReturnType<typeof getHostSnapshot> {
    if (actor.projectProfiles.some((profile) => profile.projectId === projectId))
      return getHostSnapshot(actor, projectId);
    assertProjectAccess(actor, projectId);
    return { userId: actor.id, displayName: actor.displayName, nickname: actor.displayName };
  }
  private async requireGame(
    projectId: string,
    gameId: string,
    session?: ClientSession,
  ): Promise<LottoBingoGameDocument & { _id: import("mongodb").ObjectId }> {
    const game = await this.repository.findByIdAndProjectId(gameId, projectId, session);
    if (!game)
      throw new AppError("Lotto Bingo game not found", { statusCode: 404, code: "lotto_bingo_game_not_found" });
    return game;
  }
  private throwRevisionConflict(): never {
    throw new AppError("Lotto Bingo game was changed by another operation", {
      statusCode: 409,
      code: "lotto_bingo_revision_conflict",
    });
  }
}
