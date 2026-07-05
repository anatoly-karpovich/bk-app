import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { LottoController } from "./LottoController";

export function createLottoRouter(lottoController: LottoController): Router {
  const router = Router();

  router.get("/games", asyncHandler(lottoController.listLottoGames));
  router.get("/games/latest", asyncHandler(lottoController.getLatestLottoGame));
  router.get("/games/:gameId", asyncHandler(lottoController.getLottoGameById));
  router.post("/games", asyncHandler(lottoController.createLottoGame));
  router.post("/games/:gameId/draw", asyncHandler(lottoController.drawNextNumber));
  router.delete("/games/:gameId/players/:playerId", asyncHandler(lottoController.removePlayerFromGame));
  router.delete("/games/:gameId", asyncHandler(lottoController.deleteLottoGame));

  return router;
}
