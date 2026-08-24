import type { Request, Response } from "express";
import { parseRequest } from "../../common/validation/parseRequest";
import { PlayersService } from "./PlayersService";
import { createPlayerSchema, playerParamsSchema, projectPlayersParamsSchema, updatePlayerSchema } from "./players.schemas";

export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  getAll = async (req: Request, res: Response) => {
    const { projectId } = parseRequest(projectPlayersParamsSchema, req.params, "Invalid project id");
    const players = await this.playersService.getAll(req.authUser!, projectId);
    return res.status(200).json({ success: true, data: players });
  };

  getById = async (req: Request, res: Response) => {
    const { projectId, playerId } = parseRequest(playerParamsSchema, req.params, "Invalid player id");
    const player = await this.playersService.getById(req.authUser!, projectId, playerId);
    return res.status(200).json({ success: true, data: player });
  };

  create = async (req: Request, res: Response) => {
    const { projectId } = parseRequest(projectPlayersParamsSchema, req.params, "Invalid project id");
    const { nickname } = parseRequest(createPlayerSchema, req.body, "Invalid player input");
    const player = await this.playersService.create(req.authUser!, projectId, nickname);
    return res.status(201).json({ success: true, data: player });
  };

  update = async (req: Request, res: Response) => {
    const { projectId, playerId } = parseRequest(playerParamsSchema, req.params, "Invalid player id");
    const { nickname } = parseRequest(updatePlayerSchema, req.body, "Invalid player input");
    const player = await this.playersService.update(req.authUser!, projectId, playerId, nickname);
    return res.status(200).json({ success: true, data: player });
  };

  delete = async (req: Request, res: Response) => {
    const { projectId, playerId } = parseRequest(playerParamsSchema, req.params, "Invalid player id");
    await this.playersService.delete(req.authUser!, projectId, playerId);
    return res.status(200).json({ success: true });
  };
}
