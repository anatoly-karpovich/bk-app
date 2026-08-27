import type { Request, Response } from "express";
import { parseRequest } from "../../common/validation/parseRequest";
import { ActivitiesService } from "./ActivitiesService";
import {
  activitiesProjectParamsSchema,
  activityResultParamsSchema,
  activityResultRevisionSchema,
  createActivityResultSchema,
  updateActivityResultSchema,
} from "./activities.schemas";

export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  list = async (req: Request, res: Response) =>
    this.respond(res, 200, await this.service.list(req.authUser!, this.projectId(req)));

  create = async (req: Request, res: Response) =>
    this.respond(
      res,
      201,
      await this.service.create(req.authUser!, this.projectId(req), parseRequest(createActivityResultSchema, req.body)),
    );

  get = async (req: Request, res: Response) =>
    this.respond(res, 200, await this.service.get(req.authUser!, this.projectId(req), this.activityId(req)));

  update = async (req: Request, res: Response) => {
    const input = parseRequest(updateActivityResultSchema, req.body);
    return this.respond(res, 200, await this.service.update(req.authUser!, this.projectId(req), this.activityId(req), input));
  };

  complete = async (req: Request, res: Response) =>
    this.respond(
      res,
      200,
      await this.service.complete(
        req.authUser!,
        this.projectId(req),
        this.activityId(req),
        parseRequest(activityResultRevisionSchema, req.body).expectedRevision,
      ),
    );

  delete = async (req: Request, res: Response) => {
    await this.service.delete(
      req.authUser!,
      this.projectId(req),
      this.activityId(req),
      parseRequest(activityResultRevisionSchema, req.body).expectedRevision,
    );
    return res.status(200).json({ success: true });
  };

  private projectId(req: Request): string {
    return parseRequest(activitiesProjectParamsSchema, req.params).projectId;
  }

  private activityId(req: Request): string {
    return parseRequest(activityResultParamsSchema, req.params).activityId;
  }

  private respond(res: Response, status: number, data: unknown) {
    return res.status(status).json({ success: true, data });
  }
}
