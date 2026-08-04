import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { QuizConfigsController } from "./QuizConfigsController";
import { QuizzesController } from "./QuizzesController";
import { QuizEventsController } from "./QuizEventsController";

export function createQuizzesRouter(configs: QuizConfigsController, quizzes: QuizzesController, events: QuizEventsController): Router {
  const router = Router({ mergeParams: true });
  router.get("/quiz-configs", asyncHandler(configs.list));
  router.post("/quiz-configs", asyncHandler(configs.create));
  router.get("/quiz-configs/:configId", asyncHandler(configs.get));
  router.put("/quiz-configs/:configId", asyncHandler(configs.update));
  router.delete("/quiz-configs/:configId", asyncHandler(configs.delete));
  router.post("/quiz-configs/:configId/clone", asyncHandler(configs.clone));
  router.get("/quizzes", asyncHandler(quizzes.list));
  router.post("/quizzes", asyncHandler(quizzes.create));
  router.get("/quizzes/:quizId", asyncHandler(quizzes.get));
  router.put("/quizzes/:quizId", asyncHandler(quizzes.update));
  router.delete("/quizzes/:quizId", asyncHandler(quizzes.delete));
  router.get("/quiz-events", asyncHandler(events.list));
  router.get("/quiz-events/:eventId", asyncHandler(events.get));
  router.delete("/quiz-events/:eventId", asyncHandler(events.delete));
  router.post("/quizzes/:quizId/events", asyncHandler(events.create));
  router.post("/quiz-events/:eventId/complete", asyncHandler(events.complete));
  router.post("/quiz-events/:eventId/reopen", asyncHandler(events.reopen));
  router.post("/quiz-events/:eventId/questions/:questionId/mark-not-conducted", asyncHandler(events.markAsNotConducted));
  router.put("/quiz-events/:eventId/questions/:questionId/chat", asyncHandler(events.saveQuestionChat));
  router.put("/quiz-events/:eventId/questions/:questionId/result", asyncHandler(events.saveQuestionResult));
  router.put("/quiz-events/:eventId/questions/:questionId/message", asyncHandler(events.setMessage));
  router.delete("/quiz-events/:eventId/questions/:questionId/message-override", asyncHandler(events.clearMessage));
  return router;
}
