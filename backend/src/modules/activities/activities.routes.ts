import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { ActivitiesController } from "./ActivitiesController";

export function createActivitiesRouter(controller: ActivitiesController): Router {
  const router = Router({ mergeParams: true });
  router.get("/activities", asyncHandler(controller.list));
  router.post("/activities", asyncHandler(controller.create));
  router.get("/activities/:activityId", asyncHandler(controller.get));
  router.put("/activities/:activityId", asyncHandler(controller.update));
  router.delete("/activities/:activityId", asyncHandler(controller.delete));
  return router;
}
