import type { Request, Response } from "express";
import { AppError, RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { QuizzesService } from "./QuizzesService";
import { createQuizSchema, projectIdParamsSchema, quizParamsSchema, updateQuizSchema } from "./quizzes.schemas";

export class QuizzesController {
  constructor(private readonly service: QuizzesService) {}
  list = async (req: Request, res: Response) => this.respond(res, async () => this.service.list(req.authUser!, parseRequest(projectIdParamsSchema, req.params, "Некорректный projectId").projectId));
  get = async (req: Request, res: Response) => this.respond(res, async () => { const p = parseRequest(quizParamsSchema, req.params, "Некорректные параметры"); return this.service.get(req.authUser!, p.projectId, p.quizId); });
  create = async (req: Request, res: Response) => this.respond(res, async () => this.service.create(req.authUser!, parseRequest(projectIdParamsSchema, req.params, "Некорректный projectId").projectId, parseRequest(createQuizSchema, req.body, "Некорректная викторина")), 201);
  update = async (req: Request, res: Response) => this.respond(res, async () => { const p = parseRequest(quizParamsSchema, req.params, "Некорректные параметры"); return this.service.update(req.authUser!, p.projectId, p.quizId, parseRequest(updateQuizSchema, req.body, "Некорректная викторина")); });
  delete = async (req: Request, res: Response) => this.respond(res, async () => { const p = parseRequest(quizParamsSchema, req.params, "Некорректные параметры"); await this.service.delete(req.authUser!, p.projectId, p.quizId); return null; });
  private async respond(res: Response, action: () => Promise<unknown>, status = 200) {
    try { const data = await action(); return res.status(status).json(data === null ? { success: true } : { success: true, data }); }
    catch (error) { if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message, details: error.details }); if (error instanceof RequestValidationError) return res.status(400).json({ success: false, message: error.message }); return res.status(500).json({ success: false, message: "Не удалось обработать Quiz", error: error instanceof Error ? error.message : "Unknown error" }); }
  }
}
