import type { ForumTopicMessage } from "../forumTopic/domain/types";
import { ForumTopicService } from "../forumTopic/ForumTopicService";
import { JourneyForumImportError } from "./errors";
import { parseJourneyForumMarker } from "./JourneyForumMarkers";

/** Reads player nicknames from forum messages posted before the latest Journey start marker. */
export class JourneyForumPlayersImporter {
  constructor(private readonly forumTopicService: ForumTopicService) {}

  async importPlayers(projectId: string, topicId: number, djName: string): Promise<string[]> {
    const normalizedDjName = normalizeName(djName);
    if (!normalizedDjName) {
      throw new JourneyForumImportError(
        "A DJ name is required to import Journey players from the forum",
        "journey_forum_dj_name_missing",
      );
    }

    const messages = await this.forumTopicService.getAllTopicMessagesForProject(projectId, topicId);
    const markerIndex = this.findLatestGameStartMarkerIndex(messages, normalizedDjName);

    const authors = new Map<string, string>();
    const messagesBeforeStart = markerIndex >= 0 ? messages.slice(0, markerIndex) : messages;
    for (const message of messagesBeforeStart) {
      const nickname = message.authorLogin.trim();
      const normalizedNickname = normalizeName(nickname);
      if (normalizedNickname && normalizedNickname !== normalizedDjName && !authors.has(normalizedNickname)) {
        authors.set(normalizedNickname, nickname);
      }
    }

    return [...authors.values()];
  }

  private findLatestGameStartMarkerIndex(messages: ForumTopicMessage[], normalizedDjName: string): number {
    for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
      const message = messages[messageIndex];
      const marker = normalizeName(message.authorLogin) === normalizedDjName
        ? parseJourneyForumMarker(message.text)
        : null;

      if (marker?.kind === "game_started") {
        return messageIndex;
      }
    }

    return -1;
  }
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("ru-RU");
}
