import type { Express } from "express";
import type { ApplicationDependencies } from "./createApplicationDependencies";
import { createBattleshipsRouter } from "../modules/battleships/battleships.routes";
import { createConfigsRouter } from "../modules/configs/configs.routes";
import { createForumTopicRouter } from "../modules/forumTopic/forumTopic.routes";
import { createJourneyRouter } from "../modules/journey/journey.routes";
import { createLottoRouter } from "../modules/lotto/lotto.routes";

export function registerRoutes(app: Express, dependencies: ApplicationDependencies): void {
  app.use("/api/forum/topic", createForumTopicRouter(dependencies.forumTopicController));
  app.use("/api/configs", createConfigsRouter(dependencies.configsController));
  app.use("/api/battleships", createBattleshipsRouter(dependencies.battleshipsController));
  app.use("/api/journey", createJourneyRouter(dependencies.journeyController));
  app.use("/api/lotto", createLottoRouter(dependencies.lottoController));
}
