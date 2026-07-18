import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { ConfigsController } from "./ConfigsController";

export function createConfigsRouter(configsController: ConfigsController): Router {
  const router = Router();

  router.get("/", asyncHandler(configsController.getConfigs));
  router.post("/", asyncHandler(configsController.createConfig));
  router.get("/:configId", asyncHandler(configsController.getConfig));
  router.put("/:configId", asyncHandler(configsController.updateConfig));
  router.delete("/:configId", asyncHandler(configsController.deleteConfig));

  return router;
}
