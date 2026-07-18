import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { GameConfigsController } from "./GameConfigsController";

export function createGameConfigsRouter(gameConfigsController: GameConfigsController): Router {
  const router = Router({ mergeParams: true });

  router.get("/", asyncHandler(gameConfigsController.listProjectGameConfigs));
  router.post("/", asyncHandler(gameConfigsController.createProjectGameConfig));
  router.get("/:gameConfigId", asyncHandler(gameConfigsController.getProjectGameConfig));
  router.put("/:gameConfigId", asyncHandler(gameConfigsController.updateProjectGameConfig));
  router.delete("/:gameConfigId", asyncHandler(gameConfigsController.deleteProjectGameConfig));

  return router;
}
