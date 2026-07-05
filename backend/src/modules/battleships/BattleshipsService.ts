import type { WithId } from "mongodb";
import { AppError } from "../../common/errors";
import type { ConfigsService } from "../configs/ConfigsService";
import { BattleshipsEngine } from "./BattleshipsEngine";
import { BattleshipsReadModelFactory } from "./BattleshipsReadModelFactory";
import { BattleshipsRepository, type BattleshipsGameDocument } from "./BattleshipsRepository";
import type {
  BattleshipsGame,
  BattleshipsGameListItemReadModel,
  BattleshipsGameReadModel,
  BattleshipsShotInput,
} from "./domain/types";
import {
  BattleshipsConfigNotFoundError,
  BattleshipsConfigUnsupportedError,
  BattleshipsGameNotFoundError,
  BattleshipsGamesNotFoundError,
} from "./errors";

export type BattleshipsGameResponse = BattleshipsGameReadModel;
export type BattleshipsGameListResponse = BattleshipsGameListItemReadModel[];

interface CreateBattleshipsGamePayload {
  playerName: string;
  configId: string;
  djName?: string;
}

export class BattleshipsService {
  constructor(
    private readonly repository: BattleshipsRepository,
    private readonly engine: BattleshipsEngine,
    private readonly readModelFactory: BattleshipsReadModelFactory,
    private readonly configsService: ConfigsService,
  ) {}

  async createBattleshipsGameSnapshot(
    payload: CreateBattleshipsGamePayload,
  ): Promise<BattleshipsGameResponse> {
    const config = await this.configsService.findConfigById(payload.configId);

    if (!config) {
      throw new BattleshipsConfigNotFoundError(payload.configId);
    }

    if (!config.games.battleships) {
      throw new BattleshipsConfigUnsupportedError(config.id, config.name);
    }

    const nextGame = this.engine.createGame(payload.playerName, {
      rules: config.games.battleships,
      djName: payload.djName,
      configId: config.id,
      configName: config.name,
    });

    const createdGame = await this.repository.create(nextGame);

    if (!createdGame) {
      throw new AppError("Failed to load created battleships game", {
        code: "battleships_game_create_load_failed",
        statusCode: 500,
      });
    }

    return this.serializeBattleshipsGame(createdGame);
  }

  async getBattleshipsGameSnapshot(gameId: string): Promise<BattleshipsGameResponse> {
    const game = await this.repository.findById(gameId);

    if (!game) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    return this.serializeBattleshipsGame(game);
  }

  async listBattleshipsGameSnapshots(): Promise<BattleshipsGameListResponse> {
    const games = await this.repository.findAll();
    return games.map((game) => this.readModelFactory.createListItem(game));
  }

  async getLatestBattleshipsGameSnapshot(
    status?: BattleshipsGameDocument["status"],
  ): Promise<BattleshipsGameResponse> {
    const latestGame = await this.repository.findLatest(status);

    if (!latestGame) {
      throw new BattleshipsGamesNotFoundError(status);
    }

    return this.serializeBattleshipsGame(latestGame);
  }

  async submitBattleshipsShot(gameId: string, shot: BattleshipsShotInput): Promise<BattleshipsGameResponse> {
    const currentGame = await this.repository.findById(gameId);

    if (!currentGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    const nextGame = this.engine.makeShot(currentGame, shot);
    const updatedGame = await this.saveBattleshipsGameDocument(gameId, nextGame);

    if (!updatedGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async undoBattleshipsShot(gameId: string): Promise<BattleshipsGameResponse> {
    const currentGame = await this.repository.findById(gameId);

    if (!currentGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    const nextGame = this.engine.undoLastShot(currentGame);
    const updatedGame = await this.saveBattleshipsGameDocument(gameId, nextGame);

    if (!updatedGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async deleteBattleshipsGameSnapshot(gameId: string): Promise<void> {
    const deleted = await this.repository.delete(gameId);

    if (!deleted) {
      throw new BattleshipsGameNotFoundError(gameId);
    }
  }

  private serializeBattleshipsGame(document: WithId<BattleshipsGameDocument>): BattleshipsGameResponse {
    return this.readModelFactory.create(document);
  }

  private async saveBattleshipsGameDocument(
    gameId: string,
    game: BattleshipsGame,
  ): Promise<BattleshipsGameResponse | null> {
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      return null;
    }

    const updateResult = await this.repository.update(gameId, normalizedGame);

    return updateResult ? this.serializeBattleshipsGame(updateResult) : null;
  }
}
