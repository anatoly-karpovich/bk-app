import { AppError, ExternalServiceError } from "../../common/errors";
import type { ForumTopicMessage, ForumTopicPage, ForumTopicProviderCode } from "./domain/types";
import { getForumTopicProviderForProject } from "./forumTopicProjectConfig";

const FORUM_TOPIC_PER_PAGE = 50;

const PROVIDER_CONFIG: Record<
  ForumTopicProviderCode,
  {
    endpoint: string;
    keyEnvironmentVariable?: string;
  }
> = {
  "combats-club": {
    endpoint: "https://combats-club.ru/api/forum_topic.php",
  },
  darkbk: {
    endpoint: "https://darkbk.com/forum_script/forum_topic.php",
    keyEnvironmentVariable: "DARKBK_FORUM_TOPIC_API_KEY",
  },
};

interface ForumTopicApiMessage {
  id: string | number;
  uid: string | number;
  login: string;
  text: string;
  time: number;
  date?: string;
}

interface ForumTopicApiResponse {
  success: boolean;
  topic: string | number;
  page: number;
  per_page: number;
  total_pages: number;
  messages: ForumTopicApiMessage[];
}

export class ForumTopicService {
  /** Kept for the existing CombatsClub proxy endpoint. */
  async getForumTopic(topicId: string): Promise<ForumTopicPage> {
    return await this.getTopicPage("combats-club", Number.parseInt(topicId, 10), 1);
  }

  getProviderForProject(projectId: string): ForumTopicProviderCode | null {
    return getForumTopicProviderForProject(projectId);
  }

  async getTopicPageForProject(projectId: string, topicId: number, page: number): Promise<ForumTopicPage> {
    const provider = this.getProviderForProject(projectId);

    if (!provider) {
      throw new AppError("Forum topic parsing is not configured for this project", {
        code: "forum_topic_provider_not_configured",
        statusCode: 422,
        details: { projectId },
      });
    }

    return await this.getTopicPage(provider, topicId, page);
  }

  /** Loads every topic page and returns all messages in forum chronology. */
  async getAllTopicMessagesForProject(projectId: string, topicId: number): Promise<ForumTopicMessage[]> {
    const firstPage = await this.getTopicPageForProject(projectId, topicId, 1);
    const pages = [firstPage];

    for (let pageNumber = 2; pageNumber <= firstPage.totalPages; pageNumber += 1) {
      pages.push(await this.getTopicPageForProject(projectId, topicId, pageNumber));
    }

    return pages.flatMap((page) => page.messages).sort((left, right) => left.publishedAtUnix - right.publishedAtUnix);
  }

  async getTopicPage(provider: ForumTopicProviderCode, topicId: number, page: number): Promise<ForumTopicPage> {
    if (!Number.isInteger(topicId) || topicId < 1) {
      throw new AppError("Forum topic id must be a positive integer", {
        code: "forum_topic_id_invalid",
        statusCode: 400,
        details: { topicId },
      });
    }

    if (!Number.isInteger(page) || page < 1) {
      throw new AppError("Forum topic page must be a positive integer", {
        code: "forum_topic_page_invalid",
        statusCode: 400,
        details: { page },
      });
    }

    const config = PROVIDER_CONFIG[provider];
    const apiKey = config.keyEnvironmentVariable ? process.env[config.keyEnvironmentVariable]?.trim() : undefined;

    if (config.keyEnvironmentVariable && !apiKey) {
      throw new AppError("Forum topic parsing is temporarily unavailable", {
        code: "forum_topic_provider_secret_missing",
        statusCode: 422,
        details: { provider },
      });
    }

    try {
      const url = new URL(config.endpoint);
      url.searchParams.set("topic", String(topicId));
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", String(FORUM_TOPIC_PER_PAGE));
      if (apiKey) {
        url.searchParams.set("key", apiKey);
      }

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new ExternalServiceError(`External API responded with status ${response.status}`, {
          code: "forum_topic_upstream_status",
          details: { provider, status: response.status, topicId },
        });
      }

      const data = (await response.json()) as Partial<ForumTopicApiResponse>;
      if (!this.isForumTopicResponse(data)) {
        throw new ExternalServiceError("External forum API returned an invalid response", {
          code: "forum_topic_upstream_invalid_response",
          details: { provider, topicId },
        });
      }

      if (!data.success) {
        throw new ExternalServiceError("External forum API rejected the request", {
          code: "forum_topic_upstream_rejected_request",
          details: { provider, topicId },
        });
      }

      return {
        provider,
        topicId,
        page: data.page,
        perPage: data.per_page,
        totalPages: data.total_pages,
        messages: data.messages.map((message) => this.toMessage(message)),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new ExternalServiceError("Failed to fetch forum topic", {
        cause: error,
        code: "forum_topic_fetch_failed",
        details: { provider, topicId },
      });
    }
  }

  private toMessage(message: ForumTopicApiMessage): ForumTopicMessage {
    return {
      id: String(message.id),
      authorId: String(message.uid),
      authorLogin: message.login.trim(),
      text: message.text,
      publishedAt: message.date?.trim() || new Date(message.time * 1_000).toISOString(),
      publishedAtUnix: message.time,
    };
  }

  private isForumTopicResponse(value: Partial<ForumTopicApiResponse>): value is ForumTopicApiResponse {
    return (
      typeof value.success === "boolean" &&
      (typeof value.topic === "string" || typeof value.topic === "number") &&
      typeof value.page === "number" &&
      typeof value.per_page === "number" &&
      typeof value.total_pages === "number" &&
      Array.isArray(value.messages) &&
      value.messages.every(
        (message) =>
          typeof message === "object" &&
          message !== null &&
          (typeof (message as ForumTopicApiMessage).id === "string" ||
            typeof (message as ForumTopicApiMessage).id === "number") &&
          (typeof (message as ForumTopicApiMessage).uid === "string" ||
            typeof (message as ForumTopicApiMessage).uid === "number") &&
          typeof (message as ForumTopicApiMessage).login === "string" &&
          typeof (message as ForumTopicApiMessage).text === "string" &&
          typeof (message as ForumTopicApiMessage).time === "number",
      )
    );
  }
}
