import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { JourneyController } from "./JourneyController";

export function createJourneyRouter(journeyController: JourneyController): Router {
  const router = Router({ mergeParams: true });

  router.get("/games", asyncHandler(journeyController.listJourneyGames));
  router.get("/games/latest", asyncHandler(journeyController.getLatestJourneyGame));
  router.post("/forum-players", asyncHandler(journeyController.importJourneyPlayersFromForum));
  router.post("/parse/players", journeyController.parseJourneyPlayersFromForum);
  router.get("/games/:gameId/forum-state", asyncHandler(journeyController.getJourneyForumState));
  router.post("/games/:gameId/forum-moves/preview", asyncHandler(journeyController.previewJourneyForumMoves));
  router.get("/games/:gameId", asyncHandler(journeyController.getJourneyGameById));
  router.post("/games", asyncHandler(journeyController.createJourneyGameInProject));
  router.post("/games/:gameId/rounds", asyncHandler(journeyController.makeJourneyRoundMove));
  router.patch("/games/:gameId/conducted-on", asyncHandler(journeyController.updateJourneyConductedOn));
  router.delete("/games/:gameId/players/:playerId", asyncHandler(journeyController.removeJourneyPlayerFromGame));
  router.delete("/games/:gameId", asyncHandler(journeyController.deleteJourneyGame));

  return router;
}
