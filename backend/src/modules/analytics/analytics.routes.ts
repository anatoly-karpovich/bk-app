import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { requireRole } from "../auth/auth.middleware";
import { AnalyticsController } from "./AnalyticsController";

export function createAnalyticsRouter(analyticsController: AnalyticsController): Router {
  const router = Router({ mergeParams: true });

  router.get("/status", asyncHandler(analyticsController.getStatus));
  router.post("/refresh", requireRole("admin"), asyncHandler(analyticsController.refresh));
  router.get("/overview", asyncHandler(analyticsController.getOverview));
  router.get("/players/:playerId", asyncHandler(analyticsController.getPlayerDetails));
  router.get("/players", asyncHandler(analyticsController.getPlayerLeaderboard));
  router.get("/resources", asyncHandler(analyticsController.getResources));

  return router;
}
