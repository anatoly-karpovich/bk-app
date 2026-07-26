import type { WithId } from "mongodb";
import { AppError } from "../../common/errors";
import type { GameConfigsService } from "../gameConfigs/GameConfigsService";
import { LottoEngine } from "./LottoEngine";
import { LottoReadModelFactory } from "./LottoReadModelFactory";
import { LottoRepository, type LottoGameDocument } from "./LottoRepository";
import type { LottoCreatePlayerInput, LottoGameListItemReadModel, LottoGameReadModel } from "./domain/types";
import {
  LottoGameNotFoundError,
  LottoGamesNotFoundError,
} from "./errors";

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
  ) {}

  async createLottoGameSnapshotInProject(
    projectId: string,
    payload: Omit<CreateLottoGamePayload, "configId"> & { gameConfigId: string },
  ): Promise<LottoGameResponse> {
    const gameConfigContext = await this.gameConfigsService.getLottoGameConfigContext(projectId, payload.gameConfigId);

    const nextGame = this.engine.createGame(payload.players, {
      rules: gameConfigContext.config.rules,
      currencies: gameConfigContext.projectCurrencies,
      djName: payload.djName,
      projectId,
      configId: payload.gameConfigId,
      configName: gameConfigContext.config.name,
    });

    const createdGame = await this.repository.create(nextGame);

    if (!createdGame) {
      throw new AppError("Failed to load created lotto game", {
        code: "lotto_game_create_load_failed",
        statusCode: 500,
      });
    }

    return this.serializeLottoGame(createdGame);
  }

  async getLottoGameSnapshot(projectId: string, gameId: string): Promise<LottoGameResponse> {
    const game = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!game) {
      throw new LottoGameNotFoundError(gameId);
    }

    return this.serializeLottoGame(game);
  }

  async listLottoGameSnapshots(projectId: string): Promise<LottoGameListResponse> {
    const games = await this.repository.findByProjectId(projectId);
    return games.map((game) => this.readModelFactory.createListItem(game));
  }

  async getLatestLottoGameSnapshot(projectId: string, status?: LottoGameDocument["status"]): Promise<LottoGameResponse> {
    const latestGame = await this.repository.findLatest(projectId, status);

    if (!latestGame) {
      throw new LottoGamesNotFoundError(status);
    }

    return this.serializeLottoGame(latestGame);
  }

  async drawNextLottoNumber(projectId: string, gameId: string): Promise<LottoGameResponse> {
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!currentGame) {
      throw new LottoGameNotFoundError(gameId);
    }

    const nextGame = this.engine.drawNextNumber(currentGame);
    const updatedGame = await this.saveLottoGameDocument(projectId, gameId, nextGame);

    if (!updatedGame) {
      throw new LottoGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async removeLottoPlayerFromSnapshot(projectId: string, gameId: string, playerId: string): Promise<LottoGameResponse> {
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!currentGame) {
      throw new LottoGameNotFoundError(gameId);
    }

    const nextGame = this.engine.removePlayer(currentGame, playerId);
    const updatedGame = await this.saveLottoGameDocument(projectId, gameId, nextGame);

    if (!updatedGame) {
      throw new LottoGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async deleteLottoGameSnapshot(projectId: string, gameId: string): Promise<void> {
    const deleted = await this.repository.delete(gameId, projectId);

    if (!deleted) {
      throw new LottoGameNotFoundError(gameId);
    }
  }

  private serializeLottoGame(document: WithId<LottoGameDocument>): LottoGameResponse {
    return this.readModelFactory.create(document);
  }

  private async saveLottoGameDocument(projectId: string, gameId: string, game: LottoGameDocument): Promise<LottoGameResponse | null> {
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      return null;
    }

    const updateResult = await this.repository.update(gameId, projectId, normalizedGame);
    return updateResult ? this.serializeLottoGame(updateResult) : null;
  }
}
