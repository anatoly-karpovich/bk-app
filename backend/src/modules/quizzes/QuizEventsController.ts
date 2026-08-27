import type { Request, Response } from "express";
import { AppError, RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { QuizEventsService } from "./QuizEventsService/QuizEventsService";
import {
  createQuizEventSchema,
  projectIdParamsSchema,
  quizEventParamsSchema,
  quizEventConductedOnSchema,
  quizEventQuestionParamsSchema,
  quizEventRevisionSchema,
  quizMessageKindSchema,
  quizMessageSchema,
  quizParamsSchema,
  saveQuizQuestionChatSchema,
  saveQuizQuestionResultSchema,
} from "./quizzes.schemas";

export class QuizEventsController {
  constructor(private readonly service: QuizEventsService) {}
  list = async (req: Request, res: Response) =>
    this.respond(res, () =>
      this.service.list(
        req.authUser!,
        parseRequest(projectIdParamsSchema, req.params, "Некорректный projectId").projectId,
      ),
    );
  get = async (req: Request, res: Response) =>
    this.respond(res, () => {
      const p = parseRequest(quizEventParamsSchema, req.params, "Некорректные параметры");
      return this.service.get(req.authUser!, p.projectId, p.eventId);
    });
  create = async (req: Request, res: Response) =>
    this.respond(
      res,
      () => {
        const p = parseRequest(quizParamsSchema, req.params, "Некорректные параметры");
        return this.service.create(
          req.authUser!,
          p.projectId,
          p.quizId,
          parseRequest(createQuizEventSchema, req.body, "Некорректное проведение"),
        );
      },
      201,
    );
  delete = async (req: Request, res: Response) =>
    this.respond(res, async () => {
      const p = parseRequest(quizEventParamsSchema, req.params, "Некорректные параметры");
      await this.service.delete(
        req.authUser!,
        p.projectId,
        p.eventId,
        parseRequest(quizEventRevisionSchema, req.body, "Некорректная revision").revision,
      );
      return null;
    });
  complete = async (req: Request, res: Response) =>
    this.action(req, res, (p, revision) => this.service.complete(req.authUser!, p.projectId, p.eventId, revision));
  reopen = async (req: Request, res: Response) =>
    this.action(req, res, (p, revision) => this.service.reopen(req.authUser!, p.projectId, p.eventId, revision));
  updateConductedOn = async (req: Request, res: Response) =>
    this.respond(res, () => {
      const params = parseRequest(quizEventParamsSchema, req.params, "Некорректные параметры");
      const body = parseRequest(quizEventConductedOnSchema, req.body, "Некорректная дата проведения");
      return this.service.updateConductedOn(req.authUser!, params.projectId, params.eventId, body.conductedOn, body.revision);
    });
  markAsNotConducted = async (req: Request, res: Response) =>
    this.questionAction(req, res, (p) => {
      const body = parseRequest(quizEventRevisionSchema, req.body, "ÐÐµÐºÐ¾Ñ€Ñ€ÐµÐºÑ‚Ð½Ð°Ñ revision");
      return this.service.markAsNotConducted(req.authUser!, p.projectId, p.eventId, p.questionId, body.revision);
    });
  markAsUnreviewed = async (req: Request, res: Response) =>
    this.questionAction(req, res, (p) => {
      const body = parseRequest(quizEventRevisionSchema, req.body, "Некорректная revision");
      return this.service.markAsUnreviewed(req.authUser!, p.projectId, p.eventId, p.questionId, body.revision);
    });
  setMessage = async (req: Request, res: Response) =>
    this.questionAction(req, res, (p) => {
      const body = parseRequest(quizMessageSchema, req.body, "Некорректный текст сообщения");
      return this.service.setMessage(req.authUser!, p.projectId, p.eventId, p.questionId, body.messageKind, body.text, body.revision);
    });
  clearMessage = async (req: Request, res: Response) =>
    this.questionAction(req, res, (p) => {
      const body = parseRequest(quizMessageKindSchema, req.body, "Некорректный тип сообщения");
      return this.service.setMessage(req.authUser!, p.projectId, p.eventId, p.questionId, body.messageKind, null, body.revision);
    });
  saveQuestionChat = async (req: Request, res: Response) =>
    this.questionAction(req, res, (p) => {
      const body = parseRequest(saveQuizQuestionChatSchema, req.body, "Некорректный чат вопроса");
      return this.service.saveQuestionChat(req.authUser!, p.projectId, p.eventId, p.questionId, body.rawText, body.revision);
    });
  saveQuestionResult = async (req: Request, res: Response) =>
    this.questionAction(req, res, (p) => {
      const body = parseRequest(saveQuizQuestionResultSchema, req.body, "Некорректный результат вопроса");
      return this.service.saveQuestionResult(
        req.authUser!,
        p.projectId,
        p.eventId,
        p.questionId,
        body.selections,
        body.revision,
      );
    });
  private action(
    req: Request,
    res: Response,
    action: (params: { projectId: string; eventId: string }, revision: number) => Promise<unknown>,
  ) {
    return this.respond(res, () => action(
      parseRequest(quizEventParamsSchema, req.params, "Некорректные параметры"),
      parseRequest(quizEventRevisionSchema, req.body, "Некорректная revision").revision,
    ));
  }
  private questionAction(
    req: Request,
    res: Response,
    action: (params: { projectId: string; eventId: string; questionId: string }) => Promise<unknown>,
  ) {
    return this.respond(res, () =>
      action(parseRequest(quizEventQuestionParamsSchema, req.params, "Некорректные параметры")),
    );
  }
  private async respond(res: Response, action: () => Promise<unknown>, status = 200) {
    try {
      const data = await action();
      return res.status(status).json(data === null ? { success: true } : { success: true, data });
    } catch (error) {
      if (error instanceof AppError)
        return res
          .status(error.statusCode)
          .json({ success: false, code: error.code, message: error.message, details: error.details });
      if (error instanceof RequestValidationError)
        return res.status(400).json({ success: false, message: error.message });
      return res
        .status(400)
        .json({ success: false, message: error instanceof Error ? error.message : "Не удалось изменить проведение" });
    }
  }
}
