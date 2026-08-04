# Quiz ADR — Implementation Plan

## Scope and fixed decisions

This document is the implementation sequence for the ADRs in this folder:

1. `1.host-workflow.md`
2. `2.chat-mutation-model.md`
3. `3.player-answer-selection-model.md`
4. `4.reward-calculation.md`

The plan is intentionally split into small, independently verifiable implementation passes. A pass should fit one focused agent run, have a narrow file scope, and finish with tests and type checks before the next pass starts.

### Data policy

- Existing quiz events will be deleted before deployment. No migration or backward-compatible runtime support for the previous event lifecycle is required.
- Quiz configs, quiz snapshots, and their rules remain unchanged.
- In particular, `QuizBonusRewardRule.questionIndex` remains the persisted configuration field and is not renamed or migrated.
- For a reviewed event question, a bonus slot is selected by comparing the configuration value with the actual order of conducting:

```ts
rule.questionIndex === eventQuestion.conductedOrder;
```

- Regular reward overrides continue to use the immutable source-question coordinate:

```ts
override.questionIndex === eventQuestion.questionIndex;
```

- The existing quiz reward-pool contract remains deterministic (`mode: "all"`). Random pools, manual rerolls, overrides, and a reward ledger are out of scope.

### Completion condition

After the final pass, a host can freely open any question, import or replace chat, choose answers in a local draft, save the choices, review the result, receive persisted deterministic awards, and move to any other question. The backend does not store the UI-selected question and never calculates awards during a read.

---

## Execution rules for every pass

1. Read the ADR section named by the pass and inspect the current implementation before editing.
2. Touch only the layer(s) explicitly listed for the pass. Do not opportunistically refactor unrelated quiz code.
3. Add or adjust tests in the same pass as the behavior they cover.
4. Keep the working tree buildable before handing the pass over.
5. Do not run destructive database operations. Event deletion is an operator/deployment action, not application startup behavior.
6. Use backend as the source of truth. The frontend may keep only transient UI state, including the selected question and an unsaved selection draft.

Suggested verification after each backend pass:

```text
backend: npm run test:quizzes
backend: npm run build
```

Suggested verification after each frontend pass:

```text
frontend: npm run typecheck
frontend: npm run build
```

---

## Pass 1 — Freeze the new event contract

**ADR:** Host Workflow §§ 5–12, 18–22; Reward Calculation §§ 17–21.

**Goal:** Change TypeScript domain contracts to represent the new model before implementing commands.

### Backend work

- Update `backend/src/modules/quizzes/domain/types.ts`:
  - `QuizEventStatus` becomes `"open" | "completed"`.
  - Remove `currentQuestionId`, `startedAt`, and lifecycle-only event fields.
  - Remove `QuizEventQuestionStatus`, `status`, `startedAt`, and `completedAt` from event questions.
  - Add `conductedOrder: number | null`.
  - Add `reviewedAt: string | null` and `reviewedByUserId: string | null`.
  - Replace the per-player decision status model with the persisted selected-answer model required by the selection ADR.
  - Add `revision: number` to `QuizEventDocument` and `QuizEventView`.
  - Replace summary fields with explicit prepared/conducted/reviewed counters.
  - Keep `QuizBonusRewardRule.questionIndex` unchanged.
- Define the target types for persisted awards and award source data. Award source must make it clear whether a grant was regular or bonus and must preserve the relevant source coordinate.
- Update isolated fixtures and type-only tests so the compiler describes the new target state.

### Do not do

- Do not change config schemas, config services, config validation, config snapshots, or reward editors.
- Do not change HTTP endpoints or frontend yet.
- Do not retain old lifecycle fields as a second source of truth.

### Acceptance tests

- Type fixtures can create an `open` event with an unreviewed, unconducted question.
- Type fixtures can create a conducted-but-unreviewed question.
- A bonus rule still has `{ questionIndex, position, rewardPool }`.

---

## Pass 2 — Repository revision guard and error contract

**ADR:** Host Workflow § 15; Chat Mutation § 22; Selection § 26; Reward Calculation §§ 28–29.

**Goal:** Introduce optimistic concurrency before exposing mutations that can invalidate review and awards.

### Backend work

- Extend quiz event mutation request schemas with `revision`.
- Add a typed stale-revision/concurrency error mapped to HTTP `409`.
- Change `QuizEventsRepository.update(...)` to compare `_id`, `projectId`, and the expected revision atomically, then increment the stored revision.
- Make service mutation plumbing pass the expected revision to the repository.
- Return the fresh revision in every event read/mutation response.
- Add repository/service tests proving that a stale write cannot overwrite a newer event.

### Do not do

- Do not implement review, chat replace, or frontend conflict UX in this pass.
- Do not solve a conflict by silently retrying or overwriting the newer document.

### Acceptance tests

- First mutation at revision `N` succeeds and returns `N + 1`.
- A second mutation sent with revision `N` returns the typed conflict.
- The persisted document equals the first mutation’s state after the conflict.

---

## Pass 3 — Pure ranking, awards, and summary calculators

**ADR:** Reward Calculation §§ 6–11, 18–20, 26.

**Goal:** Extract deterministic calculations from `QuizEventEngine` and ensure reads have no reward side effects.

### Backend work

- Keep `QuizAnswerRanker` pure and adapt it to the new persisted selected-answer representation.
- Add `QuizAwardCalculator`:
  - input: quiz snapshot, event question, ranking, timestamp;
  - output: deterministic persisted `QuizAward[]`;
  - regular override lookup uses `eventQuestion.questionIndex`;
  - bonus lookup uses `eventQuestion.conductedOrder` against unchanged `bonusRule.questionIndex`;
  - never reads a repository or mutates an event;
  - never uses randomness or `RewardGrantService.resolve(...)` for quiz awards.
- Add `QuizEventSummaryCalculator`:
  - uses only reviewed conducted questions and their persisted awards;
  - calculates all counters and player totals;
  - never creates awards.
- Refactor `QuizReadModelFactory` to use pure ranking/projection only. It must not call code which changes persisted state or creates awards.

### Acceptance tests

- Identical input produces byte-for-byte equivalent awards.
- A regular override matches the immutable source question index.
- A bonus rule with `questionIndex: 3` applies to the third conducted question, even when its source question index is different.
- An unreviewed conducted question is absent from summary totals.
- Calling the read-model factory never changes awards or summary.

---

## Pass 4 — Event and question workflow engine

**ADR:** Host Workflow §§ 5–10, 19–20; Reward Calculation §§ 12–16, 22–23.

**Goal:** Replace the lifecycle state machine with open/completed event commands and review-driven conducting order.

### Backend work

- Rewrite the relevant parts of `QuizEventEngine`:
  - `create()` produces an `open` event and does not select or start a question;
  - `completeEvent()` permits any number of prepared, conducted, or reviewed questions and makes the event read-only;
  - `reopenEvent()` changes `completed → open` without recalculating rewards;
  - `reviewQuestion()` assigns the next continuous `conductedOrder` when absent, sets review metadata, calculates and persists awards, then rebuilds summary;
  - re-review keeps `conductedOrder` and replaces awards from the current result;
  - `markAsNotConducted()` clears conducted/review/awards, compacts later orders, recalculates bonus awards for affected reviewed questions, and rebuilds summary;
  - effective-result changes can clear review and awards without changing `conductedOrder`.
- Remove old engine methods and guards for start, pause, resume, cancel, active question, skip, restore, and reorder.
- Update `QuizEventsService.create()` so it creates and saves the event directly; it must not start the event or a question.
- Add engine tests for order continuity, review reset, re-review, complete, reopen, and mark-not-conducted.

### Do not do

- Do not add drag-and-drop or manual conducted-order editing.
- Do not persist the frontend-selected question.
- Do not calculate awards on every save or read.

### Acceptance tests

- A new event is `open`; all questions have `conductedOrder: null`.
- Reviewing source questions `1`, `3`, `2` yields conducted orders `1`, `2`, `3`.
- Editing the result of question `3` leaves its conducted order at `2` but clears its review and awards.
- A completed event can contain unreviewed and unused questions.

---

## Pass 5 — Chat append, replace, and clear domain behavior

**ADR:** Chat Mutation §§ 5–13, 15, 20–26.

**Goal:** Make effective chat an explicit persisted state with safe mutations and auditable fragments.

### Backend work

- Preserve the existing parser → candidate filter → deduplicator pipeline for append.
- Adapt chat messages to ADR identity and effective-order semantics.
- Implement `appendChat(...)`:
  - add only new effective candidates;
  - persist an import fragment for diagnostics/audit;
  - treat duplicate-only append as a no-op for review and awards;
  - clear review/awards only when the effective chat changes.
- Implement `replaceChat(...)`:
  - parse a fresh complete source;
  - rebuild effective chat in source order;
  - retain message IDs for canonical messages that remain;
  - remove persisted selections that refer to disappeared messages;
  - clear review and awards when the effective result changes;
  - do not invent a fallback selection.
- Implement `clearChat(...)` with the destructive effects and confirmation-friendly result declared in the ADR.
- Preserve fragment history as audit data, not as a replay-based source of truth.
- Add explicit validation limits from the ADR at the API boundary.

### Acceptance tests

- Repeated append is idempotent.
- Duplicate-only append does not clear review or awards.
- Replace retains matching message IDs and prunes only invalid selections.
- Replace and clear clear review/awards when they alter effective chat.
- Effective message order is stable and does not rely solely on timestamp sorting.

---

## Pass 6 — Batch player-answer selection backend API

**ADR:** Player Answer Selection §§ 5–22, 25, 28.

**Goal:** Replace one-click persisted decisions with an explicit full-set save operation.

### Backend work

- Add a selection request DTO containing the complete selected-answer set for one event question.
- Validate atomically:
  - each referenced message exists in the question’s effective chat;
  - selected message owner equals the player name;
  - a player appears at most once;
  - no malformed or duplicate selection is partially stored.
- Give the command full replacement semantics: omitted players have no persisted selected answer.
- Detect semantic no-ops and preserve review/awards/revision rules accordingly.
- On an effective selection change, clear review/awards while retaining `conductedOrder`.
- Return the updated server ranking and event read model.
- Remove the old per-player `setPlayerAnswer` mutation after its frontend consumer has been switched in Pass 9.

### Acceptance tests

- A valid batch stores one selected message per included player.
- An invalid message ID or wrong-player message rejects the whole batch.
- Repeating the same batch is idempotent.
- A changed batch clears review and awards; an identical batch does not.

---

## Pass 7 — HTTP API transition

**ADR:** Host Workflow § 19; Chat Mutation § 19; Selection § 25; Reward Calculation § 27.

**Goal:** Expose only business actions matching the final domain model.

### Backend work

- Update `quizzes.schemas.ts`, `QuizEventsController.ts`, and `quizzes.routes.ts`.
- Provide commands for:
  - event create, complete, reopen, delete;
  - question review, unreview where supported, mark-as-not-conducted;
  - chat append, replace, clear;
  - batch selected-answer save.
- Require `revision` for every mutating request.
- Make review return the updated event plus a compact result (`conductedOrder`, award count, review time, optional next-question hint).
- Remove legacy lifecycle HTTP routes only after frontend migration is complete; no new frontend code may call them.

### Acceptance tests

- Controller tests cover validation, ownership, completed read-only behavior, and stale-revision `409` responses.
- No public route requires an active event or active question.

---

## Pass 8 — Frontend data contract and orchestration hook

**ADR:** Host Workflow §§ 3.2, 8, 13–15, 18; Selection §§ 6, 13–14, 21, 26.

**Goal:** Move page-level request orchestration and local selection state out of presentation components.

### Frontend work

- Update `frontend/src/features/utilities/quizzes/types.ts` to match the final read model. Do not retain lifecycle status fields as frontend domain state.
- Update `api/quizzes.client.ts` with explicit methods for the new endpoints; every mutation sends the latest revision.
- Extract a `useQuizEvent` hook from `QuizEventPage.tsx` that owns:
  - loading and server event state;
  - mutation busy/error state;
  - stale-revision refresh behavior;
  - local selected question ID;
  - local, per-question selected-answer draft and dirty state.
- Build local drafts from server player groups according to the selection ADR.
- Merge drafts after append and replace according to ADR rules; never autosave selections because chat changed.

### Acceptance tests / checks

- Selecting a sidebar question is local and creates no request.
- A stale mutation reloads the server state and informs the host rather than overwriting it.
- An unsaved answer draft survives ordinary local UI interactions but is reconciled correctly after fresh server chat data.

---

## Pass 9 — Host workspace UI

**ADR:** Host Workflow §§ 3–4, 11–13, 16–17, 21; Selection §§ 8–12, 23–24; Reward Calculation § 25.

**Goal:** Replace the lifecycle-driven screen with a small host-oriented workspace.

### Frontend work

- Split the current `QuizEventWorkspace.tsx` into focused feature components:
  - question navigation;
  - question/answer message previews and copy controls;
  - chat import/replace/clear controls;
  - local answer-selection editor with batch Save;
  - ranking and reviewed-result display;
  - event summary/ready-to-copy output.
- Render question state from `conductedOrder` and review metadata:
  - `Проведён #N`;
  - `Проверен`;
  - `Требует проверки`;
  - `Ещё не проведён`.
- Replace Start/Pause/Resume/Start Question/Complete Question/Skip/Restore controls with:
  - review / «К следующему вопросу»;
  - complete event;
  - reopen event;
  - secondary confirmed action «Считать вопрос непроведённым»;
  - secondary delete action.
- After successful review, move locally to the first unconducted question or use the returned navigation hint. Do not store it on the backend.
- Show conducted/reviewed/prepared progress exactly from the API read model.
- Keep completed events read-only and render a clear reopen action for an editor.

### Acceptance checks

- The host can open question 5, then question 2, without any backend mutation.
- Copy buttons do not call the backend.
- Completing an event with unused/unreviewed questions is possible after confirmation.
- Summary shows only reviewed conducted questions and persisted awards.

---

## Pass 10 — Remove the former lifecycle and final regression suite

**ADR:** All invariant and required-test sections.

**Goal:** Remove obsolete code paths and prove the complete ADR workflow.

### Cleanup

- Remove stale lifecycle DTOs, engine methods, service methods, routes, UI strings, chips, and tests.
- Remove `currentQuestionId` fallback logic from frontend selection.
- Ensure `QuizReadModelFactory` has no calculator side effects.
- Keep fragments only as audit history; do not add replay-on-read behavior.

### Required regression scenarios

- First review assigns a conducted order and awards regular + applicable bonus rewards.
- Bonus rule `questionIndex: N` is applied to conducted order `N`, not source question index `N`.
- Regular overrides remain tied to source `questionIndex`.
- Empty ranking may be reviewed and creates no awards.
- Effective append, replace, clear, or selection save clears review/awards; no-op mutations do not.
- Marking a question not conducted compacts orders and recalculates affected reviewed bonus awards.
- Complete does not review questions automatically; reopen does not recalculate awards.
- Stale revisions never overwrite current chat, selections, order, review, awards, or summary.
- Backend quiz test suite, backend build, frontend typecheck, and frontend build all pass.

---

## Definition of done

- The runtime contains no `draft`, `active`, `paused`, `cancelled`, `pending`, `skipped`, or question `completed` lifecycle behavior for quiz events.
- The runtime contains no `currentQuestionId`.
- Configs and snapshots retain their existing reward-rule shape.
- Bonus matching uses `bonusRule.questionIndex === eventQuestion.conductedOrder`.
- The backend owns effective chat, persisted selections, ranking, conducted order, review metadata, awards, and summary.
- The frontend owns only presentation, navigation, local selection draft, and request orchestration.
- Awards are deterministic, persisted only during review/reconciliation, and never created by a read.
