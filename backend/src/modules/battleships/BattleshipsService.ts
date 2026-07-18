import type { WithId } from "mongodb";
import { AppError } from "../../common/errors";
import type { GameConfigsService } from "../gameConfigs/GameConfigsService";
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
    private readonly gameConfigsService: GameConfigsService,
  ) {}

  async createBattleshipsGameSnapshotInProject(
    projectId: string,
    payload: Omit<CreateBattleshipsGamePayload, "configId"> & { gameConfigId: string },
  ): Promise<BattleshipsGameResponse> {
    const gameConfigContext = await this.gameConfigsService.getBattleshipsGameConfigContext(projectId, payload.gameConfigId);

    const nextGame = this.engine.createGame(payload.playerName, {
      rules: gameConfigContext.config.rules,
      currencies: gameConfigContext.projectCurrencies,
      djName: payload.djName,
      projectId,
      configId: payload.gameConfigId,
      configName: gameConfigContext.config.name,
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

  async getBattleshipsGameSnapshot(projectId: string, gameId: string): Promise<BattleshipsGameResponse> {
    const game = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!game) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    return this.serializeBattleshipsGame(game);
  }

  async listBattleshipsGameSnapshots(projectId: string): Promise<BattleshipsGameListResponse> {
    const games = await this.repository.findByProjectId(projectId);
    return games.map((game) => this.readModelFactory.createListItem(game));
  }

  async getLatestBattleshipsGameSnapshot(
    projectId: string,
    status?: BattleshipsGameDocument["status"],
  ): Promise<BattleshipsGameResponse> {
    const latestGame = await this.repository.findLatest(projectId, status);

    if (!latestGame) {
      throw new BattleshipsGamesNotFoundError(status);
    }

    return this.serializeBattleshipsGame(latestGame);
  }

  async submitBattleshipsShot(projectId: string, gameId: string, shot: BattleshipsShotInput): Promise<BattleshipsGameResponse> {
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!currentGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    const nextGame = this.engine.makeShot(currentGame, shot);
    const updatedGame = await this.saveBattleshipsGameDocument(projectId, gameId, nextGame);

    if (!updatedGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async undoBattleshipsShot(projectId: string, gameId: string): Promise<BattleshipsGameResponse> {
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!currentGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    const nextGame = this.engine.undoLastShot(currentGame);
    const updatedGame = await this.saveBattleshipsGameDocument(projectId, gameId, nextGame);

    if (!updatedGame) {
      throw new BattleshipsGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async deleteBattleshipsGameSnapshot(projectId: string, gameId: string): Promise<void> {
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
