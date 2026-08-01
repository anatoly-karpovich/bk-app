import type { ForumTopicMessage } from "../forumTopic/domain/types";
import { ForumTopicService } from "../forumTopic/ForumTopicService";
// @ts-nocheck
import { getJourneyConfig } from "./domain/config";
import type { JourneyV2Game } from "./domain/types";
import { JourneyForumImportError } from "./errors";
import { parseJourneyForumMarker, type JourneyForumMarker } from "./JourneyForumMarkers";

export interface JourneyForumMoveCandidate {
  playerId: string;
  playerNickname: string;
  dice: number;
  sourceMessage: {
    id: string;
    authorId: string;
    authorLogin: string;
    text: string;
    publishedAt: string;
  };
}

export interface JourneyForumMovesPreview {
  topicId: number;
  provider: string;
  nextRoundIndex: number;
  boundary: {
    kind: JourneyForumMarker["kind"];
    roundIndex: number | null;
    messageId: string;
    publishedAt: string;
  };
  moves: JourneyForumMoveCandidate[];
  ignoredMessages: Array<{
    id: string;
    authorLogin: string;
    text: string;
    reason: "player_not_active" | "dice_not_found" | "dice_out_of_range";
  }>;
}

/** Interprets normalized forum messages as Journey round input. */
export class JourneyForumMovesImporter {
  constructor(private readonly forumTopicService: ForumTopicService) {}

  async preview(game: JourneyV2Game): Promise<JourneyForumMovesPreview> {
    if (!game.forumTopicId) {
      throw new JourneyForumImportError("This game has no forum topic configured", "journey_forum_topic_missing");
    }

    const djName = game.djName.trim();
    if (!djName) {
      throw new JourneyForumImportError(
        "A DJ name is required to import Journey moves from the forum",
        "journey_forum_dj_name_missing",
      );
    }

    const messages = await this.forumTopicService.getAllTopicMessagesForProject(game.projectId, game.forumTopicId);
    const { marker, messagesAfterMarker } = this.findLatestDjMarker(messages, djName);
    const provider = this.forumTopicService.getProviderForProject(game.projectId) ?? "unknown";
    const config = getJourneyConfig(game.rules, game.resources);
    const activePlayersByNickname = new Map(
      game.stateV2.players
        .filter((player) => player.status === "active")
        .map((player) => [normalizeName(player.nickname), player]),
    );
    const candidatesByPlayerId = new Map<string, JourneyForumMoveCandidate>();
    const ignoredMessages: JourneyForumMovesPreview["ignoredMessages"] = [];

    for (const message of messagesAfterMarker) {
      const player = activePlayersByNickname.get(normalizeName(message.authorLogin));
      if (!player) {
        ignoredMessages.push({
          id: message.id,
          authorLogin: message.authorLogin,
          text: message.text,
          reason: "player_not_active",
        });
        continue;
      }

      const dice = parseFirstInteger(message.text);
      if (dice === null) {
        ignoredMessages.push({
          id: message.id,
          authorLogin: message.authorLogin,
          text: message.text,
          reason: "dice_not_found",
        });
        continue;
      }

      if (dice < config.minDice || dice > config.maxDice) {
        ignoredMessages.push({
          id: message.id,
          authorLogin: message.authorLogin,
          text: message.text,
          reason: "dice_out_of_range",
        });
        continue;
      }

      candidatesByPlayerId.set(player.id, {
        playerId: player.id,
        playerNickname: player.nickname,
        dice,
        sourceMessage: toSourceMessage(message),
      });
    }

    return {
      topicId: game.forumTopicId,
      provider,
      nextRoundIndex: game.stateV2.moveIndex + 1,
      boundary: {
        kind: marker.kind,
        roundIndex: marker.roundIndex,
        messageId: marker.message.id,
        publishedAt: marker.message.publishedAt,
      },
      moves: [...candidatesByPlayerId.values()],
      ignoredMessages,
    };
  }

  private findLatestDjMarker(
    messages: ForumTopicMessage[],
    djName: string,
  ): {
    marker: JourneyForumMarker & { message: ForumTopicMessage };
    messagesAfterMarker: ForumTopicMessage[];
  } {
    let latestGameStartMarker: {
      marker: JourneyForumMarker & { message: ForumTopicMessage };
      messagesAfterMarker: ForumTopicMessage[];
    } | null = null;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const parsedMarker =
        normalizeName(message.authorLogin) === normalizeName(djName) ? parseJourneyForumMarker(message.text) : null;

      if (parsedMarker) {
        const markerResult = {
          marker: { ...parsedMarker, message },
          messagesAfterMarker: messages.slice(index + 1),
        };

        if (parsedMarker.kind === "round") {
          return markerResult;
        }

        if (!latestGameStartMarker) {
          latestGameStartMarker = markerResult;
        }
      }
    }

    if (latestGameStartMarker) {
      return latestGameStartMarker;
    }

    throw new JourneyForumImportError(
      "No Journey start or round marker from the configured DJ was found in the forum topic",
      "journey_forum_marker_not_found",
      { scannedMessages: messages.length },
    );
  }
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("ru-RU");
}

function parseFirstInteger(text: string): number | null {
  const match = text.match(/\d+/u);
  return match ? Number.parseInt(match[0], 10) : null;
}

function toSourceMessage(message: ForumTopicMessage): JourneyForumMoveCandidate["sourceMessage"] {
  return {
    id: message.id,
    authorId: message.authorId,
    authorLogin: message.authorLogin,
    text: message.text,
    publishedAt: message.publishedAt,
  };
}
