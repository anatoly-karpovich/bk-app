import type { WithId } from "mongodb";
import { AppError } from "../../common/errors";
import type { GameConfigsService } from "../gameConfigs/GameConfigsService";
import { JourneyForumMovesImporter, type JourneyForumMovesPreview } from "./JourneyForumMovesImporter";
import { JourneyForumPlayersImporter } from "./JourneyForumPlayersImporter";
import { JourneyV2Engine } from "./JourneyV2Engine";
import { JourneyForumStateFormatter, type JourneyForumStateMessage } from "./JourneyForumStateFormatter";
import { JourneyParser } from "./JourneyParser";
import { JourneyReadModelFactory } from "./JourneyReadModelFactory";
import { JourneyRepository, type JourneyGameDocument } from "./JourneyRepository";
import type {
  JourneyGameListItemReadModel,
  JourneyGameStatus,
  JourneyGameView,
  JourneyMoveInput,
} from "./domain/types";
import type { CurrentUser } from "../auth/domain/types";
import { assertOwnedByUser, assertProjectAccess, getHostSnapshot } from "../auth/authorization";
import { JourneyGameNotFoundError, JourneyGamesNotFoundError } from "./errors";

export type JourneyGameResponse = JourneyGameView;
export type JourneyGameListResponse = JourneyGameListItemReadModel[];

interface CreateJourneyGamePayload {
  nicknames: string[];
  configId: string;
  djName?: string;
  forumTopicId?: number;
}

interface SaveJourneyRoundPayload {
  moves: JourneyMoveInput[];
  skippedPlayerIds?: string[];
}

export class JourneyService {
  constructor(
    private readonly repository: JourneyRepository,
    private readonly v2Engine: JourneyV2Engine,
    private readonly readModelFactory: JourneyReadModelFactory,
    private readonly parser: JourneyParser,
    private readonly gameConfigsService: GameConfigsService,
    private readonly forumStateFormatter: JourneyForumStateFormatter,
    private readonly forumMovesImporter: JourneyForumMovesImporter,
    private readonly forumPlayersImporter: JourneyForumPlayersImporter,
  ) {}

  async createJourneyGameSnapshotInProject(
    actor: CurrentUser,
    projectId: string,
    payload: Omit<CreateJourneyGamePayload, "configId"> & { gameConfigId: string },
  ): Promise<JourneyGameResponse> {
    const hostSnapshot = getHostSnapshot(actor, projectId);
    const gameConfigContext = await this.gameConfigsService.getJourneyGameConfigContext(
      projectId,
      payload.gameConfigId,
    );

    const nextGame = this.v2Engine.createGame(payload.nicknames, {
      rules: gameConfigContext.config.rules,
      resources: gameConfigContext.projectResources,
      djName: hostSnapshot.nickname,
      hostUserId: actor.id,
      hostSnapshot,
      projectId,
      configId: payload.gameConfigId,
      configName: gameConfigContext.config.name,
      forumTopicId: payload.forumTopicId,
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

  async getJourneyGameSnapshot(actor: CurrentUser, projectId: string, gameId: string): Promise<JourneyGameResponse> {
    assertProjectAccess(actor, projectId);
    const game = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!game) {
      throw new JourneyGameNotFoundError(gameId);
    }
    assertOwnedByUser(actor, game.hostUserId);

    return this.serializeJourneyGame(game);
  }

  async getJourneyForumState(actor: CurrentUser, projectId: string, gameId: string): Promise<JourneyForumStateMessage> {
    const game = await this.getJourneyGameSnapshot(actor, projectId, gameId);

    return this.forumStateFormatter.create(game);
  }

  async previewJourneyForumMoves(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
  ): Promise<JourneyForumMovesPreview> {
    assertProjectAccess(actor, projectId);
    const game = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!game) {
      throw new JourneyGameNotFoundError(gameId);
    }
    assertOwnedByUser(actor, game.hostUserId);

    return await this.forumMovesImporter.preview(game);
  }

  async importJourneyPlayersFromForum(actor: CurrentUser, projectId: string, forumTopicId: number): Promise<string[]> {
    return await this.forumPlayersImporter.importPlayers(
      projectId,
      forumTopicId,
      getHostSnapshot(actor, projectId).nickname,
    );
  }

  async listJourneyGameSnapshots(actor: CurrentUser, projectId: string): Promise<JourneyGameListResponse> {
    assertProjectAccess(actor, projectId);
    const games = await this.repository.findByProjectId(projectId);
    return games
      .filter((game) => actor.role === "admin" || game.hostUserId === actor.id)
      .map((game) => this.readModelFactory.createListItem(game));
  }

  async getLatestJourneyGameSnapshot(
    actor: CurrentUser,
    projectId: string,
    status?: JourneyGameStatus,
  ): Promise<JourneyGameResponse> {
    assertProjectAccess(actor, projectId);
    const latestGame = await this.repository.findLatest(projectId, status);

    if (!latestGame) {
      throw new JourneyGamesNotFoundError(status);
    }
    assertOwnedByUser(actor, latestGame.hostUserId);

    return this.serializeJourneyGame(latestGame);
  }

  async submitJourneyRound(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    payload: SaveJourneyRoundPayload,
  ): Promise<JourneyGameResponse> {
    assertProjectAccess(actor, projectId);
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!currentGame) {
      throw new JourneyGameNotFoundError(gameId);
    }
    assertOwnedByUser(actor, currentGame.hostUserId);

    const nextGame = this.v2Engine.makeRound(currentGame, payload.moves, payload.skippedPlayerIds ?? []);
    const updatedGame = await this.saveJourneyGameDocument(projectId, gameId, nextGame);

    if (!updatedGame) {
      throw new JourneyGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async removeJourneyPlayerFromSnapshot(
    actor: CurrentUser,
    projectId: string,
    gameId: string,
    playerId: string,
  ): Promise<JourneyGameResponse> {
    assertProjectAccess(actor, projectId);
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);

    if (!currentGame) {
      throw new JourneyGameNotFoundError(gameId);
    }
    assertOwnedByUser(actor, currentGame.hostUserId);

    const nextGame = this.v2Engine.removePlayer(currentGame, playerId);
    const updatedGame = await this.saveJourneyGameDocument(projectId, gameId, nextGame);

    if (!updatedGame) {
      throw new JourneyGameNotFoundError(gameId);
    }

    return updatedGame;
  }

  async deleteJourneyGameSnapshot(actor: CurrentUser, projectId: string, gameId: string): Promise<void> {
    assertProjectAccess(actor, projectId);
    const currentGame = await this.repository.findByIdAndProjectId(gameId, projectId);
    if (!currentGame) throw new JourneyGameNotFoundError(gameId);
    assertOwnedByUser(actor, currentGame.hostUserId);
    const deleted = await this.repository.delete(gameId, projectId);

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
    projectId: string,
    gameId: string,
    game: JourneyGameDocument,
  ): Promise<JourneyGameResponse | null> {
    const updateResult = await this.repository.update(gameId, projectId, game);

    return updateResult ? this.serializeJourneyGame(updateResult) : null;
  }
}
