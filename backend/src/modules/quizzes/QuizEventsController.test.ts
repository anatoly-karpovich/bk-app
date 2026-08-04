import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { QuizEventsController } from "./QuizEventsController";

function response() { const state = { statusCode: 0, body: undefined as unknown }; const res = { status: (code: number) => { state.statusCode = code; return res; }, json: (body: unknown) => { state.body = body; return res; } }; return { res: res as unknown as Response, state }; }
const request = (body: unknown): Request => ({ authUser: { id: "host" }, params: { projectId: "64b64c6f0d7f6f0000000001", eventId: "64b64c6f0d7f6f0000000002", questionId: "123e4567-e89b-12d3-a456-426614174000" }, body } as unknown as Request);

test("validates the unified chat command", async () => {
  const controller = new QuizEventsController({ saveQuestionChat: async () => ({ event: {}, mutation: {} }) } as never); const { res, state } = response();
  await controller.saveQuestionChat(request({ rawText: "chat", revision: 0 }), res);
  assert.equal(state.statusCode, 200);
});

test("validates the unified result command", async () => {
  const controller = new QuizEventsController({ saveQuestionResult: async () => ({ event: {}, result: {} }) } as never); const { res, state } = response();
  await controller.saveQuestionResult(request({ selections: [], revision: 0 }), res);
  assert.equal(state.statusCode, 200);
});
