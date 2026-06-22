import type { Express } from "express";
import type { ApplicationDependencies } from "./createApplicationDependencies";
import { createConfigsRouter } from "../modules/configs/configs.routes";
import { createForumTopicRouter } from "../modules/forumTopic/forumTopic.routes";
import { createJourneyRouter } from "../modules/journey/journey.routes";

export function registerRoutes(app: Express, dependencies: ApplicationDependencies): void {
  app.use("/api/forum/topic", createForumTopicRouter(dependencies.forumTopicController));
  app.use("/api/configs", createConfigsRouter(dependencies.configsController));
  app.use("/api/journey", createJourneyRouter(dependencies.journeyController));
}
