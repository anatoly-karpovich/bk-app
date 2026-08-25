import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { CurrentUser } from "../auth/domain/types";
import { BattleshipsService } from "../battleships/BattleshipsService";
import { JourneyService } from "../journey/JourneyService";
import { LottoService } from "../lotto/LottoService";
import { LottoBingoService } from "../lottoBingo/LottoBingoService";
import { QuizEventsService } from "../quizzes/QuizEventsService/QuizEventsService";

const admin: CurrentUser = {
  id: "admin",
  login: "admin",
  displayName: "Administrator",
  role: "admin",
  projectProfiles: [],
};

function submitter(submitted: unknown[]) {
  return {
    async submitJourneyGame(source: unknown) { submitted.push({ type: "journey", source }); },
    async submitBattleshipsGame(source: unknown) { submitted.push({ type: "battleships", source }); },
    async submitLottoGame(source: unknown) { submitted.push({ type: "lotto", source }); },
    async submitLottoBingoGame(source: unknown) { submitted.push({ type: "lotto_bingo", source }); },
    async submitQuizEvent(source: unknown) { submitted.push({ type: "quiz", source }); },
  };
}

const invalidator = { async deleteSourceFact() {}, async deleteProjectFacts() {} };

test("submits a Journey fact only after its final round is persisted", async () => {
  const submitted: unknown[] = [];
  const current = { hostUserId: "host", stateV2: { status: "in_progress" } };
  const saved = { ...current, _id: new ObjectId(), stateV2: { status: "finished" } };
  const service = new JourneyService(
    { async findByIdAndProjectId() { return current; }, async update() { return saved; } } as never,
    { makeRound() { return saved; } } as never,
    { create: () => ({}) } as never,
    {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
    invalidator as never,
    submitter(submitted) as never,
  );

  await service.submitJourneyRound(admin, "project", "game", { moves: [] });

  assert.deepEqual(submitted, [{ type: "journey", source: saved }]);
});

test("submits a Battleships fact only after its finishing shot is persisted", async () => {
  const submitted: unknown[] = [];
  const current = { hostUserId: "host", status: "in_progress" };
  const saved = { ...current, _id: new ObjectId(), status: "finished" };
  const service = new BattleshipsService(
    { async findByIdAndProjectId() { return current; }, async update() { return saved; } } as never,
    { makeShot() { return saved; }, normalizeGame(game: unknown) { return game; } } as never,
    { create: () => ({}) } as never,
    {} as never, {} as never, {} as never,
    invalidator as never,
    submitter(submitted) as never,
  );

  await service.submitBattleshipsShot(admin, "project", "game", { row: 1, column: 1 });

  assert.deepEqual(submitted, [{ type: "battleships", source: saved }]);
});

test("submits a Lotto fact only after the finishing draw is persisted", async () => {
  const submitted: unknown[] = [];
  const current = { hostUserId: "host", status: "in_progress" };
  const saved = { ...current, _id: new ObjectId(), status: "finished" };
  const service = new LottoService(
    { async findByIdAndProjectId() { return current; }, async update() { return saved; } } as never,
    { drawNextNumber() { return saved; }, normalizeGame(game: unknown) { return game; } } as never,
    { create: () => ({}) } as never,
    {} as never, {} as never, {} as never,
    invalidator as never,
    submitter(submitted) as never,
  );

  await service.drawNextLottoNumber(admin, "project", "game");

  assert.deepEqual(submitted, [{ type: "lotto", source: saved }]);
});

test("submits a Lotto Bingo fact only after finalization is persisted", async () => {
  const submitted: unknown[] = [];
  const current = { _id: new ObjectId(), hostUserId: "host", status: "in_progress", revision: 0 };
  const saved = { ...current, status: "finished", revision: 1 };
  const service = new LottoBingoService(
    { async findByIdAndProjectId() { return current; }, async update() { return saved; } } as never,
    { finalizeGame() { return saved; } } as never,
    { create: () => ({}) } as never,
    {} as never,
    { publish() {} } as never,
    {} as never,
    {} as never,
    invalidator as never,
    submitter(submitted) as never,
  );

  await service.finalizeGame(admin, "project", "game", 0);

  assert.deepEqual(submitted, [{ type: "lotto_bingo", source: saved }]);
});

test("submits a Quiz Event fact only after completion is persisted", async () => {
  const submitted: unknown[] = [];
  const current = { _id: new ObjectId(), hostUserId: "host", status: "open", revision: 0 };
  const saved = { ...current, status: "completed", revision: 1 };
  const service = new QuizEventsService(
    {
      async findByIdAndProjectId() { return current; },
      async update() { return saved; },
    } as never,
    {} as never, {} as never, {} as never,
    { completeEvent() { return saved; } } as never,
    {} as never, {} as never,
    { create: () => ({}) } as never,
    {} as never,
    invalidator as never,
    submitter(submitted) as never,
  );

  await service.complete(admin, "project", "event", 0);

  assert.deepEqual(submitted, [{ type: "quiz", source: saved }]);
});
