import { ExternalServiceError } from "../../common/errors";

const FORUM_TOPIC_API_URL = "https://combats-club.ru/api/forum_topic.php";

export class ForumTopicService {
  async getForumTopic(topicId: string): Promise<unknown> {
    try {
      const url = new URL(FORUM_TOPIC_API_URL);
      url.searchParams.set("topic", topicId);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new ExternalServiceError(`External API responded with status ${response.status}`, {
          code: "forum_topic_upstream_status",
          details: { status: response.status, topicId },
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError("Failed to fetch forum topic", {
        cause: error,
        code: "forum_topic_fetch_failed",
        details: { topicId },
      });
    }
  }
}
