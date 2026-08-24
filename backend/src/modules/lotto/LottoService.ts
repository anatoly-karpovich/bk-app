import type { WithId } from "mongodb";
import { AppError } from "../../common/errors";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { GameConfigsService } from "../gameConfigs/GameConfigsService";
import { PlayersService } from "../players/PlayersService";
import { LottoEngine } from "./LottoEngine";
import { LottoReadModelFactory } from "./LottoReadModelFactory";
import { LottoRepository, type LottoGameDocument } from "./LottoRepository";
import type { LottoCreatePlayerInput, LottoGameListItemReadModel, LottoGameReadModel } from "./domain/types";
import type { CurrentUser } from "../auth/domain/types";
import { assertOwnedByUser, assertProjectAccess, getHostSnapshot } from "../auth/authorization";
import { LottoGameNotFoundError, LottoGamesNotFoundError } from "./errors";

export type LottoGameResponse = LottoGameReadModel;
export type LottoGameListResponse = LottoGameListItemReadModel[];

interface CreateLottoGamePayload {
  players: LottoCreatePlayerInput[];
  configId: string;
  djName?: string;
}

export class LottoService {
  constructor(
    private readonly repository: LottoRepository,
    private readonly engine: LottoEngine,
    private readonly readModelFactory: LottoReadModelFactory,
    private readonly gameConfigsService: GameConfigsService,
    private readonly playersService: PlayersService,
    private readonly mongoDatabase: MongoDatabase,
  ) {}

  async createLottoGameSnapshotInProject(
    actor: CurrentUser,
    projectId: string,
    payload: Omit<CreateLottoGamePayload, "configId"> & { gameConfigId: string },
  ): Promise<LottoGameResponse> {
    const hostSnapshot = getHostSnapshot(actor, projectId);
    const gameConfigContext = await this.gameConfigsService.getLottoGameConfigContext(projectId, payload.gameConfigId);

    const createdGame = await this.mongoDatabase.withTransaction(async (session) => {
      const players = [];
      for (const player of payload.players) {
        players.push({
          ...(await this.playersService.resolveOrCreate(actor, projectId, player, session)),
          cardNumbers: player.cardNumbers,
        });
      }
      const nextGame = this.engine.createGame(players, {
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
      throw new AppError("Failed to load created lotto game", {
        code: "lotto_game_create_load_failed",
        statusCode: 500,
      });
    }

    return this.serializeLottoGame(createdGame);
  }

  async getLottoGameSnapshot(actor: CurrentUser, projectId: string, gameId: string): Promise<LottoGameResponse> {
    assertProjectAccess(actor, projectId);
    const game = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!game) {
      throw new LottoGameNotFoundError(gameId);
    }
    assertOwnedByUser(actor, game.hostUserId);

    return this.serializeLottoGame(game);
  }

  async listLottoGameSnapshots(actor: CurrentUser, projectId: string): Promise<LottoGameListResponse> {
    assertProjectAccess(actor, projectId);
    const games = await this.repository.findByProjectId(projectId);
    return games
      .filter((game) => actor.role === "admin" || game.hostUserId === actor.id)
      .map((game) => this.readModelFactory.createListItem(game));
  }

  async getLatestLottoGameSnapshot(
    actor: CurrentUser,
    projectId: string,
    status?: LottoGameDocument["status"],
  ): Promise<LottoGameResponse> {
    assertProjectAccess(actor, projectId);
    const latestGame = await this.repository.findLatest(projectId, status);

    if (!latestGame) {
      throw new LottoGamesNotFoundError(status);
    }
    assertOwnedByUser(actor, latestGame.hostUserId);

    return this.serializeLottoGame(latestGame);
  }

  async drawNextLottoNumber(actor: CurrentUser, projectId: string, gameId: string): Promise<LottoGameResponse> {
    assertProjectAccess(actor, projectId);
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!currentGame) {
      throw new LottoGameNotFoundError(gameId);
    }
    assertOwnedByUser(actor, currentGame.hostUserId);

    const nextGame = this.engine.drawNextNumber(currentGame);
    const updatedGame = await this.saveLottoGameDocument(projectId, gameId, nextGame);

    if (!updatedGame) {
      throw new LottoGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async removeLottoPlayerFromSnapshot(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    playerId: string,
  ): Promise<LottoGameResponse> {
    assertProjectAccess(actor, projectId);
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!currentGame) {
      throw new LottoGameNotFoundError(gameId);
    }
    assertOwnedByUser(actor, currentGame.hostUserId);

    const nextGame = this.engine.removePlayer(currentGame, playerId);
    const updatedGame = await this.saveLottoGameDocument(projectId, gameId, nextGame);

    if (!updatedGame) {
      throw new LottoGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async deleteLottoGameSnapshot(actor: CurrentUser, projectId: string, gameId: string): Promise<void> {
    assertProjectAccess(actor, projectId);
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);
    if (!currentGame) throw new LottoGameNotFoundError(gameId);
    assertOwnedByUser(actor, currentGame.hostUserId);
    const deleted = await this.repository.delete(gameId, projectId);

    if (!deleted) {
      throw new LottoGameNotFoundError(gameId);
    }
  }

  private serializeLottoGame(document: WithId<LottoGameDocument>): LottoGameResponse {
    return this.readModelFactory.create(document);
  }

  private async saveLottoGameDocument(
    projectId: string,
    gameId: string,
    game: LottoGameDocument,
  ): Promise<LottoGameResponse | null> {
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      return null;
    }

    const updateResult = await this.repository.update(gameId, projectId, normalizedGame);
    return updateResult ? this.serializeLottoGame(updateResult) : null;
  }
}
