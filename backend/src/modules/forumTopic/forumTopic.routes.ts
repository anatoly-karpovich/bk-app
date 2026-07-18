import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { ForumTopicController } from "./ForumTopicController";

export function createForumTopicRouter(forumTopicController: ForumTopicController): Router {
  const router = Router();

  router.get("/", asyncHandler(forumTopicController.getForumTopic));

  return router;
}
