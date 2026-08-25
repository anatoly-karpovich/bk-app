import assert from "node:assert/strict";
import test from "node:test";
import { BestEffortAnalyticsProjectionSubmitter } from "./AnalyticsProjectionSubmitter";

function adapter(sourceType: string, kind: "game" | "quiz_event") {
  return {
    sourceType,
    async findFinishedByProjectId() {
      return [];
    },
    describe(source: { projectId: string; id: string }) {
      return {
        projectId: source.projectId,
        occurredAt: "2026-08-25T00:00:00.000Z",
        source: { kind, type: sourceType, id: source.id, revision: null, updatedAt: "2026-08-25T00:00:00.000Z" },
      };
    },
    buildFact() {
      throw new Error("Projection service mock must not build facts");
    },
  };
}

test("submits each completed source through its source-specific adapter", async () => {
  const submitted: Array<{ sourceType: string; id: string }> = [];
  const projectionService = {
    async submitSource(sourceAdapter: { sourceType: string }, source: { id: string }) {
      submitted.push({ sourceType: sourceAdapter.sourceType, id: source.id });
    },
  };
  const submitter = new BestEffortAnalyticsProjectionSubmitter(projectionService as never, {
    journey: adapter("journey", "game") as never,
    battleships: adapter("battleships", "game") as never,
    lotto: adapter("lotto", "game") as never,
    lottoBingo: adapter("lotto_bingo", "game") as never,
    quizEvent: adapter("quiz", "quiz_event") as never,
  });
  const source = (id: string) => ({ projectId: "project-a", id });

  await submitter.submitJourneyGame(source("journey-a") as never);
  await submitter.submitBattleshipsGame(source("battleships-a") as never);
  await submitter.submitLottoGame(source("lotto-a") as never);
  await submitter.submitLottoBingoGame(source("lotto-bingo-a") as never);
  await submitter.submitQuizEvent(source("quiz-a") as never);

  assert.deepEqual(submitted, [
    { sourceType: "journey", id: "journey-a" },
    { sourceType: "battleships", id: "battleships-a" },
    { sourceType: "lotto", id: "lotto-a" },
    { sourceType: "lotto_bingo", id: "lotto-bingo-a" },
    { sourceType: "quiz", id: "quiz-a" },
  ]);
});

test("logs submission failure without rethrowing after canonical save", async () => {
  const logged: Array<{ message: string; context: Record<string, unknown> }> = [];
  const submitter = new BestEffortAnalyticsProjectionSubmitter(
    { async submitSource() { throw new Error("projection unavailable"); } } as never,
    {
      journey: adapter("journey", "game") as never,
      battleships: adapter("battleships", "game") as never,
      lotto: adapter("lotto", "game") as never,
      lottoBingo: adapter("lotto_bingo", "game") as never,
      quizEvent: adapter("quiz", "quiz_event") as never,
    },
    { error: (message, context) => logged.push({ message, context }) },
  );

  await submitter.submitLottoGame({ projectId: "project-a", id: "lotto-a" } as never);

  assert.equal(logged.length, 1);
  assert.equal(logged[0]?.message, "Analytics source fact submission failed");
  assert.deepEqual(
    { operation: logged[0]?.context.operation, projectId: logged[0]?.context.projectId, sourceId: logged[0]?.context.sourceId },
    { operation: "submit_lotto_fact", projectId: "project-a", sourceId: "lotto-a" },
  );
});
