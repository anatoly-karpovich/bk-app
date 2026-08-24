import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { PlayersController } from "./PlayersController";

export function createPlayersRouter(playersController: PlayersController): Router {
  const router = Router({ mergeParams: true });
  router.get("/players", asyncHandler(playersController.getAll));
  router.post("/players", asyncHandler(playersController.create));
  router.get("/players/:playerId", asyncHandler(playersController.getById));
  router.put("/players/:playerId", asyncHandler(playersController.update));
  router.delete("/players/:playerId", asyncHandler(playersController.delete));
  return router;
}
