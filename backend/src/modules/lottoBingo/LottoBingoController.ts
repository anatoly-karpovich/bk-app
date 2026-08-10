import type { Request, Response } from "express";
import { parseRequest } from "../../common/validation/parseRequest";
import { LottoBingoService } from "./LottoBingoService";
import { addLottoBingoPlayerSchema, confirmLottoBingoWinnersSchema, createLottoBingoGameSchema, lottoBingoGameParamsSchema, lottoBingoPlayerParamsSchema, lottoBingoProjectParamsSchema, revisionSchema } from "./lottoBingo.schemas";

export class LottoBingoController {
  constructor(private readonly service: LottoBingoService) {}
  create = async (req: Request, res: Response) => this.respond(res, 201, await this.service.createGame(req.authUser!, this.projectId(req), parseRequest(createLottoBingoGameSchema, req.body).gameConfigId));
  list = async (req: Request, res: Response) => this.respond(res, 200, await this.service.listGames(req.authUser!, this.projectId(req)));
  latest = async (req: Request, res: Response) => this.respond(res, 200, await this.service.getLatestGame(req.authUser!, this.projectId(req)));
  get = async (req: Request, res: Response) => this.respond(res, 200, await this.service.getGame(req.authUser!, this.projectId(req), this.gameId(req)));
  addPlayer = async (req: Request, res: Response) => { const body = parseRequest(addLottoBingoPlayerSchema, req.body); return this.respond(res, 200, await this.service.addPlayer(req.authUser!, this.projectId(req), this.gameId(req), body.nickname, body.expectedRevision)); };
  removePlayer = async (req: Request, res: Response) => { const body = parseRequest(revisionSchema, req.body); const { playerId } = parseRequest(lottoBingoPlayerParamsSchema, req.params); return this.respond(res, 200, await this.service.removePlayer(req.authUser!, this.projectId(req), this.gameId(req), playerId, body.expectedRevision)); };
  start = async (req: Request, res: Response) => this.withRevision(req, res, (revision) => this.service.startGame(req.authUser!, this.projectId(req), this.gameId(req), revision));
  draw = async (req: Request, res: Response) => this.withRevision(req, res, (revision) => this.service.drawBarrel(req.authUser!, this.projectId(req), this.gameId(req), revision));
  undo = async (req: Request, res: Response) => this.withRevision(req, res, (revision) => this.service.undoDraw(req.authUser!, this.projectId(req), this.gameId(req), revision));
  confirmWinners = async (req: Request, res: Response) => { const body = parseRequest(confirmLottoBingoWinnersSchema, req.body); return this.respond(res, 200, await this.service.confirmWinners(req.authUser!, this.projectId(req), this.gameId(req), body.playerIds, body.expectedRevision)); };
  disqualify = async (req: Request, res: Response) => { const { playerId } = parseRequest(lottoBingoPlayerParamsSchema, req.params); return this.withRevision(req, res, (revision) => this.service.disqualifyPlayer(req.authUser!, this.projectId(req), this.gameId(req), playerId, revision)); };
  restore = async (req: Request, res: Response) => { const { playerId } = parseRequest(lottoBingoPlayerParamsSchema, req.params); return this.withRevision(req, res, (revision) => this.service.restorePlayer(req.authUser!, this.projectId(req), this.gameId(req), playerId, revision)); };
  finalize = async (req: Request, res: Response) => this.withRevision(req, res, (revision) => this.service.finalizeGame(req.authUser!, this.projectId(req), this.gameId(req), revision));
  events = async (req: Request, res: Response) => {
    const unsubscribe = await this.service.subscribe(req.authUser!, this.projectId(req), this.gameId(req), (event) => {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });
    res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.flushHeaders();
    req.on("close", unsubscribe);
  };
  delete = async (req: Request, res: Response) => { const { expectedRevision } = parseRequest(revisionSchema, req.body); await this.service.deleteGame(req.authUser!, this.projectId(req), this.gameId(req), expectedRevision); return res.status(200).json({ success: true }); };
  private projectId(req: Request) { return parseRequest(lottoBingoProjectParamsSchema, req.params).projectId; }
  private gameId(req: Request) { return parseRequest(lottoBingoGameParamsSchema, req.params).gameId; }
  private async withRevision(req: Request, res: Response, operation: (revision: number) => Promise<unknown>) { return this.respond(res, 200, await operation(parseRequest(revisionSchema, req.body).expectedRevision)); }
  private respond(res: Response, status: number, data: unknown) { return res.status(status).json({ success: true, data }); }
}
