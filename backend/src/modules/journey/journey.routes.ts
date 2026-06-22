import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { JourneyController } from "./JourneyController";

export function createJourneyRouter(journeyController: JourneyController): Router {
  const router = Router();

  router.get("/games", asyncHandler(journeyController.listJourneyGames));
  router.get("/games/latest", asyncHandler(journeyController.getLatestJourneyGame));
  router.get("/games/:gameId", asyncHandler(journeyController.getJourneyGameById));
  router.post("/games", asyncHandler(journeyController.createJourneyGame));
  router.post("/games/:gameId/rounds", asyncHandler(journeyController.makeJourneyRoundMove));
  router.delete("/games/:gameId/players/:playerId", asyncHandler(journeyController.removeJourneyPlayerFromGame));
  router.delete("/games/:gameId", asyncHandler(journeyController.deleteJourneyGame));

  router.post("/parse/players", journeyController.parseJourneyPlayersFromForum);
  router.post("/parse/moves", journeyController.parseJourneyMovesFromForum);

  return router;
}
