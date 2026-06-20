import type { Request, Response } from "express";

const FORUM_TOPIC_API_URL = "https://combats-club.ru/api/forum_topic.php";

export async function getForumTopic(req: Request, res: Response) {
  const topicId = req.query.topicId;

  if (typeof topicId !== "string" || !topicId.trim()) {
    return res.status(400).json({
      success: false,
      message: "Missing required query parameter: topicId",
    });
  }

  try {
    const url = new URL(FORUM_TOPIC_API_URL);
    url.searchParams.set("topic", topicId);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: `External API responded with status ${response.status}`,
      });
    }

    const data: unknown = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown external API error";

    return res.status(502).json({
      success: false,
      message: "Failed to fetch forum topic",
      error: message,
    });
  }
}
