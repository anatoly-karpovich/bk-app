import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { BattleshipsController } from "./BattleshipsController";

export function createBattleshipsRouter(battleshipsController: BattleshipsController): Router {
  const router = Router({ mergeParams: true });

  router.get("/games", asyncHandler(battleshipsController.listBattleshipsGames));
  router.get("/games/latest", asyncHandler(battleshipsController.getLatestBattleshipsGame));
  router.get("/games/:gameId", asyncHandler(battleshipsController.getBattleshipsGameById));
  router.post("/games", asyncHandler(battleshipsController.createBattleshipsGameInProject));
  router.post("/games/:gameId/shots", asyncHandler(battleshipsController.makeBattleshipsShot));
  router.post("/games/:gameId/shots/undo", asyncHandler(battleshipsController.undoBattleshipsShot));
  router.patch("/games/:gameId/conducted-on", asyncHandler(battleshipsController.updateBattleshipsConductedOn));
  router.delete("/games/:gameId", asyncHandler(battleshipsController.deleteBattleshipsGame));

  return router;
}
