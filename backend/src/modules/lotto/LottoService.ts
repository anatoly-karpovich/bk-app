import type { WithId } from "mongodb";
import { AppError } from "../../common/errors";
import type { ConfigsService } from "../configs/ConfigsService";
import { LottoEngine } from "./LottoEngine";
import { LottoReadModelFactory } from "./LottoReadModelFactory";
import { LottoRepository, type LottoGameDocument } from "./LottoRepository";
import type { LottoCreatePlayerInput, LottoGameListItemReadModel, LottoGameReadModel } from "./domain/types";
import {
  LottoConfigNotFoundError,
  LottoConfigUnsupportedError,
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
    private readonly configsService: ConfigsService,
  ) {}

  async createLottoGameSnapshot(payload: CreateLottoGamePayload): Promise<LottoGameResponse> {
    const config = await this.configsService.findConfigById(payload.configId);

    if (!config) {
      throw new LottoConfigNotFoundError(payload.configId);
    }

    if (!config.games.lotto) {
      throw new LottoConfigUnsupportedError(config.id, config.name);
    }

    const nextGame = this.engine.createGame(payload.players, {
      rules: config.games.lotto,
      currency: config.currency,
      djName: payload.djName,
      configId: config.id,
      configName: config.name,
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

  async getLottoGameSnapshot(gameId: string): Promise<LottoGameResponse> {
    const game = await this.repository.findById(gameId);

    if (!game) {
      throw new LottoGameNotFoundError(gameId);
    }

    return this.serializeLottoGame(game);
  }

  async listLottoGameSnapshots(): Promise<LottoGameListResponse> {
    const games = await this.repository.findAll();
    return games.map((game) => this.readModelFactory.createListItem(game));
  }

  async getLatestLottoGameSnapshot(status?: LottoGameDocument["status"]): Promise<LottoGameResponse> {
    const latestGame = await this.repository.findLatest(status);

    if (!latestGame) {
      throw new LottoGamesNotFoundError(status);
    }

    return this.serializeLottoGame(latestGame);
  }

  async drawNextLottoNumber(gameId: string): Promise<LottoGameResponse> {
    const currentGame = await this.repository.findById(gameId);

    if (!currentGame) {
      throw new LottoGameNotFoundError(gameId);
    }

    const nextGame = this.engine.drawNextNumber(currentGame);
    const updatedGame = await this.saveLottoGameDocument(gameId, nextGame);

    if (!updatedGame) {
      throw new LottoGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async removeLottoPlayerFromSnapshot(gameId: string, playerId: string): Promise<LottoGameResponse> {
    const currentGame = await this.repository.findById(gameId);

    if (!currentGame) {
      throw new LottoGameNotFoundError(gameId);
    }

    const nextGame = this.engine.removePlayer(currentGame, playerId);
    const updatedGame = await this.saveLottoGameDocument(gameId, nextGame);

    if (!updatedGame) {
      throw new LottoGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async deleteLottoGameSnapshot(gameId: string): Promise<void> {
    const deleted = await this.repository.delete(gameId);

    if (!deleted) {
      throw new LottoGameNotFoundError(gameId);
    }
  }

  private serializeLottoGame(document: WithId<LottoGameDocument>): LottoGameResponse {
    return this.readModelFactory.create(document);
  }

  private async saveLottoGameDocument(gameId: string, game: LottoGameDocument): Promise<LottoGameResponse | null> {
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      return null;
    }

    const updateResult = await this.repository.update(gameId, normalizedGame);
    return updateResult ? this.serializeLottoGame(updateResult) : null;
  }
}
