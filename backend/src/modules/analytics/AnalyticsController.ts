import type { Request, Response } from "express";
import { parseRequest } from "../../common/validation/parseRequest";
import { AnalyticsReadModelFactory } from "./AnalyticsReadModelFactory";
import { AnalyticsService } from "./AnalyticsService";
import {
  analyticsPlayerDetailsParamsSchema,
  analyticsPlayerDetailsQuerySchema,
  analyticsPlayersQuerySchema,
  analyticsProjectParamsSchema,
  analyticsReadQuerySchema,
} from "./analytics.schemas";

export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly readModelFactory: AnalyticsReadModelFactory,
  ) {}

  getStatus = async (req: Request, res: Response) => {
    const { projectId } = this.getProjectParams(req);
    const report = await this.analyticsService.getStatus(req.authUser!, projectId);
    return res.status(200).json({ success: true, data: this.readModelFactory.createStatus(report) });
  };

  refresh = async (req: Request, res: Response) => {
    const { projectId } = this.getProjectParams(req);
    const report = await this.analyticsService.refreshProject(req.authUser!, projectId);
    return res.status(200).json({ success: true, data: this.readModelFactory.createRefresh(report) });
  };

  getOverview = async (req: Request, res: Response) => {
    const { projectId } = this.getProjectParams(req);
    const query = parseRequest(analyticsReadQuerySchema, req.query, "Invalid analytics query");
    const overview = await this.analyticsService.getOverview(req.authUser!, projectId, query);
    return res.status(200).json({ success: true, data: this.readModelFactory.createOverview(overview) });
  };

  getResources = async (req: Request, res: Response) => {
    const { projectId } = this.getProjectParams(req);
    const query = parseRequest(analyticsReadQuerySchema, req.query, "Invalid analytics query");
    const resources = await this.analyticsService.getResources(req.authUser!, projectId, query);
    return res.status(200).json({ success: true, data: this.readModelFactory.createResources(resources) });
  };

  getPlayerLeaderboard = async (req: Request, res: Response) => {
    const { projectId } = this.getProjectParams(req);
    const query = parseRequest(analyticsPlayersQuerySchema, req.query, "Invalid analytics players query");
    const players = await this.analyticsService.getPlayerLeaderboard(req.authUser!, projectId, query);
    return res.status(200).json({ success: true, data: this.readModelFactory.createPlayerLeaderboard(players) });
  };

  getPlayerDetails = async (req: Request, res: Response) => {
    const { projectId, playerId } = parseRequest(analyticsPlayerDetailsParamsSchema, req.params, "Invalid analytics player route parameters");
    const query = parseRequest(analyticsPlayerDetailsQuerySchema, req.query, "Invalid analytics player query");
    const details = await this.analyticsService.getPlayerDetails(req.authUser!, projectId, playerId, query);
    return res.status(200).json({ success: true, data: this.readModelFactory.createPlayerDetails(details) });
  };

  private getProjectParams(req: Request) {
    return parseRequest(analyticsProjectParamsSchema, req.params, "Route parameter 'projectId' must be a valid project id");
  }
}
