import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { ConfigsController } from "./ConfigsController";

export function createConfigsRouter(configsController: ConfigsController): Router {
  const router = Router();

  router.get("/", asyncHandler(configsController.getConfigs));
  router.get("/:configId", asyncHandler(configsController.getConfig));

  return router;
}
