# AGENTS.md - Repository Entry Point

## Project purpose

`bk-app` is an application for running radio/forum/chat games for the BK community.

The project is being migrated from a legacy vanilla JavaScript implementation to a React + backend architecture.

Legacy implementation:

```text
LEGACY/
```

Current application:

```text
frontend/
backend/
```

Current migrated games in the React + backend application:

- Journey
- Battleships
- Lotto

---

## Main goal

The goal of the migration is not to simply wrap old JavaScript code into React.

The goal is to build a cleaner architecture where:

- backend owns game state and game rules
- frontend renders UI and communicates with backend
- localStorage is not used as the source of truth
- game logic is modular, testable, and extendable
- new games can be added without copy-pasting entire flows

---

## Module-specific instructions

Before changing backend code, read:

```text
backend/AGENTS.md
```

Before changing frontend code, read:

```text
frontend/AGENTS.md
```

If a task touches both frontend and backend, read both files first.

---

## Architecture preferences

Prefer clear, responsibility-driven TypeScript architecture.

Important principles:

- separate UI, API, domain, persistence, and configuration concerns
- avoid duplicating game rules between frontend and backend
- keep project-level config concerns explicit, including shared project resources (currencies and items)
- treat `Project` and project-owned `GameConfig` presets as the active configuration model
- prefer shared source components for repeated host-facing UI patterns such as player-name inputs, page headers, and saved-game actions
- prefer extracting shared UI/layout components once the same structure appears in more than one feature
- prefer one shared source of truth for repeated navigation or framing UI such as breadcrumbs, page headers, and saved-game layouts
- avoid massive files and god objects
- prefer small classes/services with clear ownership
- use functional helpers only when they are simple utilities
- keep business logic out of React components
- keep database access out of controllers
- preserve user-facing behavior during migration

SOLID is treated as a thinking tool, not as ceremony.

Use it to keep responsibilities clean and avoid mixing unrelated concerns.

---

## Backend responsibility

The backend is the source of truth for:

- game state
- projects, project-owned game-config presets, and project resources
- game rules
- parsing and resolving game actions
- persistence

Backend modules should move toward:

```text
Controller -> Service -> Repository
                      -> Domain classes / engines / resolvers
```

Journey runtime supports only `JourneyV2Game`. Legacy Journey normalization is an offline backup-import concern and must not be wired into application dependencies, routes, or normal game reads/mutations.

Journey exposes one public `JourneyGameView` read model for every game endpoint. Do not reintroduce raw persisted rounds, player move history, duplicate player collections, or storage-format details into the API or UI.

---

## Frontend responsibility

The frontend is responsible for:

- rendering pages and components
- collecting user input
- calling backend APIs
- showing loading/error states
- mapping backend data into UI-friendly view models
- storing only lightweight client preferences or identifiers

Frontend must not own final game rules or final game state.

Project-level resources and preset rules must be read from project-scoped backend APIs, not recreated independently per frontend feature.

---

## Shared rewards and game-owned payouts

`RewardGrantService` is a backend dependency that resolves a `RewardPool` into the resources that dropped. It owns pool mechanics only: `all`, `weighted_one`, and `independent` selection.

- Inject the service into game engines; do not make it depend on a game, player balances, limits, recipient selection, or persistence.
- Each game owns when a pool is resolved, which recipients get its result, how it is split, and its domain limits. Keep this policy in that game's domain classes.
- Persist every resolved grant or payout in game state. Restored games and undo/read paths must display the saved outcome, never re-resolve a pool.
- Presets may reference project resources, but games retain their resource snapshot so historical results remain interpretable after a project catalog changes.

Current host-facing pages such as Journey, Battleships, and Lotto should stay operator-first: quick setup, clear state, visible restore/delete flows, and ready-to-copy outputs for forum/radio use.

Journey forum messages are backend-generated from compact comment events. Keep player-action wording gender-neutral with forms such as `нашёл(-ла)` and `угодил(-а)`.

---

## LocalStorage policy

Do not use localStorage as a database.

Allowed:

- current game id
- theme
- UI preferences
- temporary drafts if needed

Not allowed:

- full game state
- rounds
- players
- project/preset definitions
- calculated game results

---

## Migration rule

When migrating from `LEGACY/`:

1. Understand old behavior.
2. Preserve behavior where it is still valid.
3. Move game rules to backend.
4. Move UI rendering to React components.
5. Remove localStorage-based persistence.
6. Split large logic into focused services/classes.
7. Avoid copying legacy code structure blindly.

Legacy code may contain useful domain ideas, but the new implementation should use cleaner TypeScript architecture.

---

## Do not do

Avoid:

- duplicating backend engine logic in frontend
- duplicating the same page/layout/component structure across multiple game features when it can live in a shared component
- putting business logic into React pages
- adding new games by copy-pasting existing game modules blindly
- creating one huge engine class that knows everything
- scattering API calls across components
- introducing abstractions before they are needed
- changing legacy behavior without understanding it first

---

## Preferred workflow

For every task:

1. Identify whether it is frontend, backend, or full-stack.
2. Read the relevant `AGENTS.md`.
3. Inspect existing patterns before editing.
4. Keep changes small and scoped.
5. Prefer clear ownership over clever code.
6. Preserve current behavior unless the task explicitly changes it.
7. Mention architectural concerns if the requested change conflicts with these rules.
