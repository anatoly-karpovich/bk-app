# Journey Achievement Progress Read-Model

## Context

Journey achievement awarding is backend-owned and correctly resolved in:

- `backend/src/modules/journey/domain/engine.ts`

The frontend currently also computes achievement progress for the "Game State" card in:

- `frontend/src/features/journey/journey-page.helpers.ts`

This includes UI-side interpretation of streak rules such as:

- `Careful`
- `Unlucky`
- `Lucky`
- `Collector`

## Problem

This is not final game-result logic, but it still duplicates backend rule interpretation.

Current risks:

- backend and frontend can drift on thresholds or edge cases
- UI can display incorrect progress while backend still awards achievements correctly
- fixes require touching two places instead of one
- jackpot-related and finish-related edge cases must be re-implemented on the frontend

Recent example:

- `Careful` was changed from 3 empty cells in a row to 4
- backend rule was updated first
- frontend progress target still showed 3 in the "Game State" card

## Target State

Backend should expose achievement progress as derived/read-model data, and frontend should only render it.

Recommended ownership split:

- backend: calculate current streak, best streak, target, achieved state, collector obtained/missing cells
- frontend: display chips, labels, counters, and history

## Proposed Backend Output

Add a derived structure to Journey game responses, for example:

```ts
derived: {
  achievementProgressByPlayerId: {
    [playerId: string]: {
      unlucky: { achieved: boolean; current: number; best: number; target: number };
      careful: { achieved: boolean; current: number; best: number; target: number };
      lucky: { achieved: boolean; current: number; best: number; target: number };
      collector: {
        achieved: boolean;
        obtainedCellIds: string[];
        missingCellIds: string[];
      };
    };
  };
}
```

Exact shape can vary, but the frontend should not need to recompute rule semantics from timeline entries.

## Frontend Follow-Up

After backend exposes the read-model:

1. remove `getAchievementProgress(...)` from `frontend/src/features/journey/journey-page.helpers.ts`
2. remove helper predicates that encode backend rule semantics for streaks
3. read precomputed progress from backend response in `JourneyStateCard.tsx`
4. keep frontend-only formatting and presentation logic only

## Acceptance Criteria

- changing a Journey achievement rule requires backend changes only
- "Game State" progress matches backend behavior for normal and edge-case moves
- frontend no longer infers `Careful`/`Unlucky`/`Lucky`/`Collector` progress from raw timeline data
- jackpot edge cases are represented by backend-derived progress, not frontend re-implementation
