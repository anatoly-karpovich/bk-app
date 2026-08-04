import type { Request, Response } from "express";
import { AppError, RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { QuizEventsService } from "./QuizEventsService";
import { chatFragmentSchema, createQuizEventSchema, playerAnswerSchema, projectIdParamsSchema, quizEventParamsSchema, quizEventQuestionParamsSchema, quizMessageKindSchema, quizMessageSchema, quizParamsSchema, reorderQuizQuestionsSchema } from "./quizzes.schemas";

export class QuizEventsController {
  constructor(private readonly service: QuizEventsService) {}
  list = async (req: Request, res: Response) => this.respond(res, () => this.service.list(req.authUser!, parseRequest(projectIdParamsSchema, req.params, "Некорректный projectId").projectId));
  get = async (req: Request, res: Response) => this.respond(res, () => { const p = parseRequest(quizEventParamsSchema, req.params, "Некорректные параметры"); return this.service.get(req.authUser!, p.projectId, p.eventId); });
  create = async (req: Request, res: Response) => this.respond(res, () => { const p = parseRequest(quizParamsSchema, req.params, "Некорректные параметры"); return this.service.create(req.authUser!, p.projectId, p.quizId, parseRequest(createQuizEventSchema, req.body, "Некорректное проведение")); }, 201);
  delete = async (req: Request, res: Response) => this.respond(res, async () => { const p = parseRequest(quizEventParamsSchema, req.params, "Некорректные параметры"); await this.service.delete(req.authUser!, p.projectId, p.eventId); return null; });
  start = async (req: Request, res: Response) => this.action(req, res, (p) => this.service.start(req.authUser!, p.projectId, p.eventId));
  pause = async (req: Request, res: Response) => this.action(req, res, (p) => this.service.pause(req.authUser!, p.projectId, p.eventId));
  resume = async (req: Request, res: Response) => this.action(req, res, (p) => this.service.resume(req.authUser!, p.projectId, p.eventId));
  complete = async (req: Request, res: Response) => this.action(req, res, (p) => this.service.complete(req.authUser!, p.projectId, p.eventId));
  cancel = async (req: Request, res: Response) => this.action(req, res, (p) => this.service.cancel(req.authUser!, p.projectId, p.eventId));
  reorder = async (req: Request, res: Response) => this.action(req, res, (p) => this.service.reorder(req.authUser!, p.projectId, p.eventId, parseRequest(reorderQuizQuestionsSchema, req.body, "Некорректный порядок").questionIds));
  startQuestion = async (req: Request, res: Response) => this.questionAction(req, res, (p) => this.service.startQuestion(req.authUser!, p.projectId, p.eventId, p.questionId));
  completeQuestion = async (req: Request, res: Response) => this.questionAction(req, res, (p) => this.service.completeQuestion(req.authUser!, p.projectId, p.eventId, p.questionId));
  skipQuestion = async (req: Request, res: Response) => this.questionAction(req, res, (p) => this.service.skipQuestion(req.authUser!, p.projectId, p.eventId, p.questionId));
  restoreQuestion = async (req: Request, res: Response) => this.questionAction(req, res, (p) => this.service.restoreQuestion(req.authUser!, p.projectId, p.eventId, p.questionId));
  setMessage = async (req: Request, res: Response) => this.questionAction(req, res, (p) => { const body = parseRequest(quizMessageSchema, req.body, "Некорректный текст сообщения"); return this.service.setMessage(req.authUser!, p.projectId, p.eventId, p.questionId, body.messageKind, body.text); });
  clearMessage = async (req: Request, res: Response) => this.questionAction(req, res, (p) => { const body = parseRequest(quizMessageKindSchema, req.body, "Некорректный тип сообщения"); return this.service.setMessage(req.authUser!, p.projectId, p.eventId, p.questionId, body.messageKind, null); });
  addFragment = async (req: Request, res: Response) => this.questionAction(req, res, (p) => this.service.addChatFragment(req.authUser!, p.projectId, p.eventId, p.questionId, parseRequest(chatFragmentSchema, req.body, "Некорректный chat fragment").rawText));
  setPlayerAnswer = async (req: Request, res: Response) => this.questionAction(req, res, (p) => this.service.setPlayerAnswer(req.authUser!, p.projectId, p.eventId, p.questionId, parseRequest(playerAnswerSchema, req.body, "Некорректное решение по ответу")));
  private action(req: Request, res: Response, action: (params: { projectId: string; eventId: string }) => Promise<unknown>) { return this.respond(res, () => action(parseRequest(quizEventParamsSchema, req.params, "Некорректные параметры"))); }
  private questionAction(req: Request, res: Response, action: (params: { projectId: string; eventId: string; questionId: string }) => Promise<unknown>) { return this.respond(res, () => action(parseRequest(quizEventQuestionParamsSchema, req.params, "Некорректные параметры"))); }
  private async respond(res: Response, action: () => Promise<unknown>, status = 200) { try { const data = await action(); return res.status(status).json(data === null ? { success: true } : { success: true, data }); } catch (error) { if (error instanceof AppError) return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message, details: error.details }); if (error instanceof RequestValidationError) return res.status(400).json({ success: false, message: error.message }); return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Не удалось изменить проведение" }); } }
}
