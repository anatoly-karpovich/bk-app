import { Router } from "express";
import {
  createJourneyGame,
  deleteJourneyGame,
  getJourneyGameById,
  getLatestJourneyGame,
  makeJourneyRoundMove,
  parseJourneyMovesFromForum,
  parseJourneyPlayersFromForum,
  removeJourneyPlayerFromGame,
  updateJourneyGameSnapshot,
} from "../controllers/journey.controller";

const router = Router();

router.get("/games/latest", getLatestJourneyGame);
router.get("/games/:gameId", getJourneyGameById);
router.post("/games", createJourneyGame);
router.put("/games/:gameId", updateJourneyGameSnapshot);
router.post("/games/:gameId/rounds", makeJourneyRoundMove);
router.delete("/games/:gameId/players/:playerId", removeJourneyPlayerFromGame);
router.delete("/games/:gameId", deleteJourneyGame);

router.post("/parse/players", parseJourneyPlayersFromForum);
router.post("/parse/moves", parseJourneyMovesFromForum);

export default router;
