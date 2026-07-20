import type { Express } from "express";
import { asyncHandler } from "../common/http/asyncHandler";
import type { ApplicationDependencies } from "./createApplicationDependencies";
import { createBattleshipsRouter } from "../modules/battleships/battleships.routes";
import { createForumTopicRouter } from "../modules/forumTopic/forumTopic.routes";
import { createGameConfigsRouter } from "../modules/gameConfigs/gameConfigs.routes";
import { createJourneyRouter } from "../modules/journey/journey.routes";
import { createLottoRouter } from "../modules/lotto/lotto.routes";
import { createProjectsRouter } from "../modules/projects/projects.routes";

export function registerRoutes(app: Express, dependencies: ApplicationDependencies): void {
  app.get("/api/health", (_request, response) => {
    response.status(200).json({ success: true, data: { status: "ok" } });
  });
  app.use("/api/forum/topic", createForumTopicRouter(dependencies.forumTopicController));
  app.use("/api/projects", createProjectsRouter(dependencies.projectsController));
  app.use("/api/projects/:projectId/game-configs", createGameConfigsRouter(dependencies.gameConfigsController));
  app.use("/api/projects/:projectId/battleships", createBattleshipsRouter(dependencies.battleshipsController));
  app.use("/api/projects/:projectId/journey", createJourneyRouter(dependencies.journeyController));
  app.use("/api/projects/:projectId/lotto", createLottoRouter(dependencies.lottoController));
  app.post("/api/journey/parse/players", dependencies.journeyController.parseJourneyPlayersFromForum);
  app.post("/api/journey/parse/moves", dependencies.journeyController.parseJourneyMovesFromForum);
}
