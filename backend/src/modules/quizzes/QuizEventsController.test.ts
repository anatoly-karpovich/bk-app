import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { ForbiddenError } from "../../common/errors";
import { QuizConflictError, QuizEventRevisionConflictError } from "./errors";
import { QuizEventsController } from "./QuizEventsController";

const projectId = "507f1f77bcf86cd799439011";
const eventId = "507f1f77bcf86cd799439012";
const questionId = "123e4567-e89b-12d3-a456-426614174000";

function request(body: unknown): Request {
  return {
    authUser: { id: "host" },
    params: { projectId, eventId, questionId },
    body,
  } as unknown as Request;
}

function response() {
  let statusCode = 200;
  let body: unknown;
  const res = {
    status: (nextStatus: number) => {
      statusCode = nextStatus;
      return res;
    },
    json: (nextBody: unknown) => {
      body = nextBody;
      return res;
    },
  };
  return {
    res: res as unknown as Response,
    result: () => ({ statusCode, body }),
  };
}

test("reviews a question through the revision-guarded business command", async () => {
  const calls: unknown[][] = [];
  const reviewResult = {
    event: { id: eventId, revision: 4 },
    result: {
      conductedOrder: 2,
      awardsCount: 3,
      reviewedAt: "2026-08-04T12:00:00.000Z",
      nextUnconductedQuestionId: null,
    },
  };
  const controller = new QuizEventsController({
    review: async (...args: unknown[]) => {
      calls.push(args);
      return reviewResult;
    },
  } as never);
  const { res, result } = response();

  await controller.review(request({ revision: 3 }), res);

  assert.deepEqual(calls, [[{ id: "host" }, projectId, eventId, questionId, 3]]);
  assert.deepEqual(result(), { statusCode: 200, body: { success: true, data: reviewResult } });
});

test("rejects a mutation without its event revision before calling the service", async () => {
  const controller = new QuizEventsController({
    review: async () => assert.fail("service must not be called"),
  } as never);
  const { res, result } = response();

  await controller.review(request({}), res);

  assert.equal(result().statusCode, 400);
});

test("maps ownership, completed read-only, and stale-revision failures to their HTTP contracts", async () => {
  const scenarios = [
    {
      controller: new QuizEventsController({ review: async () => { throw new ForbiddenError(); } } as never),
      invoke: (controller: QuizEventsController, res: Response) => controller.review(request({ revision: 3 }), res),
      statusCode: 403,
      code: "FORBIDDEN",
    },
    {
      controller: new QuizEventsController({ appendChat: async () => { throw new QuizConflictError("Completed event"); } } as never),
      invoke: (controller: QuizEventsController, res: Response) => controller.appendChat(request({ revision: 3, rawText: "chat" }), res),
      statusCode: 409,
      code: "quiz_conflict",
    },
    {
      controller: new QuizEventsController({
        saveAnswerSelections: async () => { throw new QuizEventRevisionConflictError(eventId, 3); },
      } as never),
      invoke: (controller: QuizEventsController, res: Response) => controller.saveAnswerSelections(request({ revision: 3, selections: [] }), res),
      statusCode: 409,
      code: "quiz_event_revision_conflict",
    },
  ];

  for (const scenario of scenarios) {
    const { res, result } = response();
    await scenario.invoke(scenario.controller, res);
    assert.deepEqual(result(), {
      statusCode: scenario.statusCode,
      body: {
        success: false,
        code: scenario.code,
        message: result().body && (result().body as { message: string }).message,
        details: result().body && (result().body as { details?: unknown }).details,
      },
    });
  }
});
