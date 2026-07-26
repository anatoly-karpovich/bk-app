import type { Request, Response } from "express";
import { AppError, ExternalServiceError, RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { forumTopicQuerySchema } from "./forumTopic.schemas";
import { ForumTopicService } from "./ForumTopicService";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown external API error";
}

export class ForumTopicController {
  constructor(private readonly forumTopicService: ForumTopicService) {}

  getForumTopic = async (req: Request, res: Response) => {
    try {
      const { topicId } = parseRequest(
        forumTopicQuerySchema,
        req.query,
        "Missing required query parameter: topicId",
      );
      const data = await this.forumTopicService.getForumTopic(topicId);

      return res.status(200).json(data);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Missing required query parameter: topicId",
        });
      }

      if (error instanceof ExternalServiceError) {
        if (error.message.startsWith("External API responded with status ")) {
          return res.status(502).json({
            success: false,
            message: error.message,
          });
        }

        return res.status(502).json({
          success: false,
          message: "Failed to fetch forum topic",
          error: getErrorMessage(error.cause),
        });
      }

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      return res.status(502).json({
        success: false,
        message: "Failed to fetch forum topic",
        error: getErrorMessage(error),
      });
    }
  };
}
