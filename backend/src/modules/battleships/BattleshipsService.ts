import type { WithId } from "mongodb";
import { AppError } from "../../common/errors";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { GameConfigsService } from "../gameConfigs/GameConfigsService";
import { PlayersService, type PlayerReferenceInput } from "../players/PlayersService";
import { BattleshipsEngine } from "./BattleshipsEngine";
import { BattleshipsReadModelFactory } from "./BattleshipsReadModelFactory";
import { BattleshipsRepository, type BattleshipsGameDocument } from "./BattleshipsRepository";
import type {
  BattleshipsGame,
  BattleshipsGameListItemReadModel,
  BattleshipsGameReadModel,
  BattleshipsShotInput,
} from "./domain/types";
import type { CurrentUser } from "../auth/domain/types";
import { assertOwnedByUser, assertProjectAccess, getHostSnapshot } from "../auth/authorization";
import { BattleshipsGameNotFoundError, BattleshipsGamesNotFoundError } from "./errors";

export type BattleshipsGameResponse = BattleshipsGameReadModel;
export type BattleshipsGameListResponse = BattleshipsGameListItemReadModel[];

interface CreateBattleshipsGamePayload {
  player: PlayerReferenceInput;
  configId: string;
  djName?: string;
}

export class BattleshipsService {
  constructor(
    private readonly repository: BattleshipsRepository,
    private readonly engine: BattleshipsEngine,
    private readonly readModelFactory: BattleshipsReadModelFactory,
    private readonly gameConfigsService: GameConfigsService,
    private readonly playersService: PlayersService,
    private readonly mongoDatabase: MongoDatabase,
  ) {}

  async createBattleshipsGameSnapshotInProject(
    actor: CurrentUser,
    projectId: string,
    payload: Omit<CreateBattleshipsGamePayload, "configId"> & { gameConfigId: string },
  ): Promise<BattleshipsGameResponse> {
    const hostSnapshot = getHostSnapshot(actor, projectId);
    const gameConfigContext = await this.gameConfigsService.getBattleshipsGameConfigContext(
      projectId,
      payload.gameConfigId,
    );

    const createdGame = await this.mongoDatabase.withTransaction(async (session) => {
      const player = await this.playersService.resolveOrCreate(actor, projectId, payload.player, session);
      const nextGame = this.engine.createGame(player, {
        rules: gameConfigContext.config.rules,
        resources: gameConfigContext.projectResources,
        djName: hostSnapshot.nickname,
        hostUserId: actor.id,
        hostSnapshot,
        projectId,
        configId: payload.gameConfigId,
        configName: gameConfigContext.config.name,
      });

      return this.repository.create(nextGame, session);
    });

    if (!createdGame) {
      throw new AppError("Failed to load created battleships game", {
        code: "battleships_game_create_load_failed",
        statusCode: 500,
      });
    }

    return this.serializeBattleshipsGame(createdGame);
  }

  async getBattleshipsGameSnapshot(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
  ): Promise<BattleshipsGameResponse> {
    assertProjectAccess(actor, projectId);
    const game = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!game) {
      throw new BattleshipsGameNotFoundError(gameId);
    }
    assertOwnedByUser(actor, game.hostUserId);

    return this.serializeBattleshipsGame(game);
  }

  async listBattleshipsGameSnapshots(actor: CurrentUser, projectId: string): Promise<BattleshipsGameListResponse> {
    assertProjectAccess(actor, projectId);
    const games = await this.repository.findByProjectId(projectId);
    return games
      .filter((game) => actor.role === "admin" || game.hostUserId === actor.id)
      .map((game) => this.readModelFactory.createListItem(game));
  }

  async getLatestBattleshipsGameSnapshot(
    actor: CurrentUser,
    projectId: string,
    status?: BattleshipsGameDocument["status"],
  ): Promise<BattleshipsGameResponse> {
    const latestGame = await this.repository.findLatest(projectId, status);

    if (!latestGame) {
      throw new BattleshipsGamesNotFoundError(status);
    }
    assertOwnedByUser(actor, latestGame.hostUserId);

    return this.serializeBattleshipsGame(latestGame);
  }

  async submitBattleshipsShot(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    shot: BattleshipsShotInput,
  ): Promise<BattleshipsGameResponse> {
    assertProjectAccess(actor, projectId);
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!currentGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }
    assertOwnedByUser(actor, currentGame.hostUserId);

    const nextGame = this.engine.makeShot(currentGame, shot);
    const updatedGame = await this.saveBattleshipsGameDocument(projectId, gameId, nextGame);

    if (!updatedGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async undoBattleshipsShot(actor: CurrentUser, projectId: string, gameId: string): Promise<BattleshipsGameResponse> {
    assertProjectAccess(actor, projectId);
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!currentGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }
    assertOwnedByUser(actor, currentGame.hostUserId);

    const nextGame = this.engine.undoLastShot(currentGame);
    const updatedGame = await this.saveBattleshipsGameDocument(projectId, gameId, nextGame);

    if (!updatedGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async deleteBattleshipsGameSnapshot(actor: CurrentUser, projectId: string, gameId: string): Promise<void> {
    assertProjectAccess(actor, projectId);
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);
    if (!currentGame) throw new BattleshipsGameNotFoundError(gameId);
    assertOwnedByUser(actor, currentGame.hostUserId);
    const deleted = await this.repository.delete(gameId, projectId);

    if (!deleted) {
      throw new BattleshipsGameNotFoundError(gameId);
    }
  }

  private serializeBattleshipsGame(document: WithId<BattleshipsGameDocument>): BattleshipsGameResponse {
    return this.readModelFactory.create(document);
  }

  private async saveBattleshipsGameDocument(
    projectId: string,
    gameId: string,
    game: BattleshipsGame,
  ): Promise<BattleshipsGameResponse | null> {
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      return null;
    }

    const updateResult = await this.repository.update(gameId, projectId, normalizedGame);

    return updateResult ? this.serializeBattleshipsGame(updateResult) : null;
  }
}
