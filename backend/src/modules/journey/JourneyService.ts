import type { WithId } from "mongodb";
import { AppError } from "../../common/errors";
import type { ConfigsService } from "../configs/ConfigsService";
import { JourneyEngine } from "./JourneyEngine";
import { JourneyParser } from "./JourneyParser";
import { JourneyReadModelFactory } from "./JourneyReadModelFactory";
import { JourneyRepository, type JourneyGameDocument } from "./JourneyRepository";
import type { JourneyGameListItemReadModel, JourneyGameReadModel, JourneyMoveInput } from "./domain/types";
import {
  JourneyConfigNotFoundError,
  JourneyConfigUnsupportedError,
  JourneyGameNotFoundError,
  JourneyGamesNotFoundError,
} from "./errors";

export type JourneyGameResponse = JourneyGameReadModel;
export type JourneyGameListResponse = JourneyGameListItemReadModel[];

interface CreateJourneyGamePayload {
  nicknames: string[];
  configId: string;
  djName?: string;
}

interface SaveJourneyRoundPayload {
  moves: JourneyMoveInput[];
  skippedPlayerIds?: string[];
}

export class JourneyService {
  constructor(
    private readonly repository: JourneyRepository,
    private readonly engine: JourneyEngine,
    private readonly readModelFactory: JourneyReadModelFactory,
    private readonly parser: JourneyParser,
    private readonly configsService: ConfigsService,
  ) {}

  async createJourneyGameSnapshot(payload: CreateJourneyGamePayload): Promise<JourneyGameResponse> {
    const config = await this.configsService.findConfigById(payload.configId);

    if (!config) {
      throw new JourneyConfigNotFoundError(payload.configId);
    }

    if (!config.games.journey) {
      throw new JourneyConfigUnsupportedError(config.id, config.name);
    }

    const nextGame = this.engine.createGame(payload.nicknames, {
      rules: config.games.journey,
      djName: payload.djName,
      configId: config.id,
      configName: config.name,
    });

    const createdGame = await this.repository.create(nextGame);

    if (!createdGame) {
      throw new AppError("Failed to load created game", {
        code: "journey_game_create_load_failed",
        statusCode: 500,
      });
    }

    return this.serializeJourneyGame(createdGame);
  }

  async getJourneyGameSnapshot(gameId: string): Promise<JourneyGameResponse> {
    const game = await this.repository.findById(gameId);

    if (!game) {
      throw new JourneyGameNotFoundError(gameId);
    }

    return this.serializeJourneyGame(game);
  }

  async listJourneyGameSnapshots(): Promise<JourneyGameListResponse> {
    const games = await this.repository.findAll();

    return games.map((game) => this.readModelFactory.createListItem(game));
  }

  async getLatestJourneyGameSnapshot(status?: JourneyGameDocument["status"]): Promise<JourneyGameResponse> {
    const latestGame = await this.repository.findLatest(status);

    if (!latestGame) {
      throw new JourneyGamesNotFoundError(status);
    }

    return this.serializeJourneyGame(latestGame);
  }

  async submitJourneyRound(
    gameId: string,
    payload: SaveJourneyRoundPayload,
  ): Promise<JourneyGameResponse> {
    const currentGame = await this.repository.findById(gameId);

    if (!currentGame) {
      throw new JourneyGameNotFoundError(gameId);
    }

    const nextGame = this.engine.makeRound(currentGame, payload.moves, payload.skippedPlayerIds ?? []);
    const updatedGame = await this.saveJourneyGameDocument(gameId, nextGame);

    if (!updatedGame) {
      throw new JourneyGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async removeJourneyPlayerFromSnapshot(
    gameId: string,
    playerId: string,
  ): Promise<JourneyGameResponse> {
    const currentGame = await this.repository.findById(gameId);

    if (!currentGame) {
      throw new JourneyGameNotFoundError(gameId);
    }

    const nextGame = this.engine.removePlayer(currentGame, playerId);
    const updatedGame = await this.saveJourneyGameDocument(gameId, nextGame);

    if (!updatedGame) {
      throw new JourneyGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async deleteJourneyGameSnapshot(gameId: string): Promise<void> {
    const deleted = await this.repository.delete(gameId);

    if (!deleted) {
      throw new JourneyGameNotFoundError(gameId);
    }
  }

  parseJourneyPlayers(text: string, djName = ""): string[] {
    return this.parser.parsePlayers(text, djName);
  }

  parseJourneyMoves(text: string): Record<string, number> {
    return this.parser.parseMoves(text);
  }

  private serializeJourneyGame(document: WithId<JourneyGameDocument>): JourneyGameResponse {
    return this.readModelFactory.create(document);
  }

  private async saveJourneyGameDocument(
    gameId: string,
    game: JourneyGameDocument,
  ): Promise<JourneyGameResponse | null> {
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      return null;
    }

    const updateResult = await this.repository.update(gameId, normalizedGame);

    return updateResult ? this.serializeJourneyGame(updateResult) : null;
  }
}
