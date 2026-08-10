import type { Express } from "express";
import { asyncHandler } from "../common/http/asyncHandler";
import type { ApplicationDependencies } from "./createApplicationDependencies";
import { createBattleshipsRouter } from "../modules/battleships/battleships.routes";
import { createForumTopicRouter } from "../modules/forumTopic/forumTopic.routes";
import { createGameConfigsRouter } from "../modules/gameConfigs/gameConfigs.routes";
import { createJourneyRouter } from "../modules/journey/journey.routes";
import { createLottoRouter } from "../modules/lotto/lotto.routes";
import { createLottoBingoRouter } from "../modules/lottoBingo/lottoBingo.routes";
import { createProjectsRouter } from "../modules/projects/projects.routes";
import { createAuthRouter } from "../modules/auth/auth.routes";
import { createRequireAuth } from "../modules/auth/auth.middleware";
import { createUsersRouter } from "../modules/users/users.routes";
import { createQuizzesRouter } from "../modules/quizzes/quizzes.routes";

export function registerRoutes(app: Express, dependencies: ApplicationDependencies): void {
  app.get("/api/health", (_request, response) => {
    response.status(200).json({ success: true, data: { status: "ok" } });
  });
  app.use("/api/auth", createAuthRouter(dependencies.authController, dependencies.authService));
  app.use("/api", createRequireAuth(dependencies.authService));
  app.use("/api/users", createUsersRouter(dependencies.usersController));
  app.use("/api/forum/topic", createForumTopicRouter(dependencies.forumTopicController));
  app.use("/api/projects", createProjectsRouter(dependencies.projectsController));
  app.use("/api/projects/:projectId/game-configs", createGameConfigsRouter(dependencies.gameConfigsController));
  app.use("/api/projects/:projectId", createQuizzesRouter(dependencies.quizConfigsController, dependencies.quizzesController, dependencies.quizEventsController));
  app.use("/api/projects/:projectId/battleships", createBattleshipsRouter(dependencies.battleshipsController));
  app.use("/api/projects/:projectId/journey", createJourneyRouter(dependencies.journeyController));
  app.use("/api/projects/:projectId/lotto", createLottoRouter(dependencies.lottoController));
  app.use("/api/projects/:projectId/lotto-bingo", createLottoBingoRouter(dependencies.lottoBingoController));
  app.post("/api/journey/parse/moves", dependencies.journeyController.parseJourneyMovesFromForum);
}
