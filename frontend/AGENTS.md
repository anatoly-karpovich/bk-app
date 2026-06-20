# AGENTS.md

## Purpose

This `frontend` app is a React + MUI operator panel for forum games.

Today the only implemented game is `Journey` (`Карта Мародёров`), but the UI shell is already moving toward a multi-game structure:

- global nav/header
- shared project/ruleset selection
- game-specific page headers
- reusable UI primitives

When editing this app, optimize for:

- preserving the current game logic
- keeping UI consistent through shared components and theme
- keeping text/configuration out of JSX where practical
- preparing the codebase for future backend-driven configs and more games

---

## Technology Stack

- React 18
- React Router 6
- MUI 5
- Emotion
- Vite 5
- Browser storage via `localStorage`

Entry points:

- [src/main.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/main.jsx:1)
- [src/App.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/App.jsx:1)

Build commands:

- `npm run dev`
- `npm run build`
- `npm run preview`

Use `npm run build` as the minimum verification step after meaningful changes.

---

## Project Map

### Shell and App Structure

- [src/main.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/main.jsx:1)
  Mounts React, `ThemeProvider`, `CssBaseline`, and `BrowserRouter`.

- [src/App.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/App.jsx:1)
  Owns app-level state that must be shared across routes:
  - DJ name
  - available journey rulesets
  - current default ruleset id

  It renders:
  - global header
  - route container
  - `JourneyPage`
  - transitional `JourneyRulesetsPage`

### Theme and Design System

- [src/theme.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/theme.js:1)
  Single source of truth for:
  - palette
  - typography
  - base MUI overrides
  - semantic radii via `theme.customRadii`

### Shared UI Components

- [src/components/ui/AppTextInput.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/components/ui/AppTextInput.jsx:1)
- [src/components/ui/AppChip.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/components/ui/AppChip.jsx:1)
- [src/components/ui/AppPillButton.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/components/ui/AppPillButton.jsx:1)
- [src/components/ui/AppBreadcrumbs.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/components/ui/AppBreadcrumbs.jsx:1)

These are the preferred primitives for repeated UI patterns in this app.

### Global Header

- [src/components/AppHeader.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/components/AppHeader.jsx:1)

Responsibilities:

- brand and game navigation
- mobile drawer
- DJ name input
- project/ruleset selector
- config entrypoint

### Journey Feature

- [src/features/journey/JourneyPage.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/JourneyPage.jsx:1)
  Main operator screen.

- [src/features/journey/JourneyRulesetsPage.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/JourneyRulesetsPage.jsx:1)
  Transitional config page for rulesets. Still active, but conceptually moving toward a global config screen.

- [src/features/journey/engine.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/engine.js:1)
  Core game engine. This is the most sensitive file in the frontend.

- [src/features/journey/config.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/config.js:1)
  Built-in rulesets, normalization, config derivation, achievements metadata.

- [src/features/journey/storage.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/storage.js:1)
  `localStorage` boundary for game snapshots and rulesets.

- [src/features/journey/parsers.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/parsers.js:1)
  Forum text parsing for players and moves.

- [src/features/journey/commentTemplates.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/commentTemplates.js:1)
  Comment/log text generation support.

### Text Dictionaries

- [src/texts/appHeaderTexts.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/texts/appHeaderTexts.js:1)
- [src/texts/journeyTexts.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/texts/journeyTexts.js:1)

Prefer adding/editing UI copy here instead of hardcoding strings in JSX.

---

## Routing

Current routes in [src/App.jsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/App.jsx:65):

- `/` -> redirects to `/journey`
- `/journey` -> main game page
- `/journey/config` -> ruleset configuration page

Notes:

- `JourneyRulesetsPage` is still real and wired.
- Product direction suggests configs will eventually move to backend/global config.
- Do not casually delete `/journey/config` without also updating `AppHeader` and the current config flow.

---

## State and Data Flow

### App-Level State

Owned by `App`:

- `djName`
- `journeyRulesetsState.rulesets`
- `journeyRulesetsState.defaultRulesetId`

Why:

- the global header and routed pages need the same source of truth
- changing default ruleset in the header must be reflected across routes

### Journey Page State

Owned by `JourneyPage`:

- current game snapshot
- player name draft list
- imported forum text
- current round inputs
- skip toggles
- modal/dialog open state
- hover state for map popper
- expanded player row state

Rule of thumb:

- transient screen interaction state stays in `JourneyPage`
- durable cross-route state stays in `App`
- pure game mutations stay in `engine.js`
- persistence stays in `storage.js`

### Ruleset Behavior

Critical product rule:

- `default ruleset` affects only new games
- an already started game keeps its own rules snapshot

This behavior is encoded in the current architecture. Do not break it.

---

## Storage Model

Storage keys in [storage.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/storage.js:1):

- `combats-dj:journey`
- `combats-dj:journey:rulesets`
- `combats-dj:journey:default-ruleset-id`
- `combats-dj:dj-name` is managed in `App.jsx`

Important behaviors:

- game snapshots are normalized when read
- custom rulesets are normalized when read/write
- built-in rulesets always win on id collisions
- deleting the default custom ruleset falls back to the built-in default

If you change storage shape:

1. keep backward compatibility if practical
2. normalize on load
3. never trust raw `localStorage` payloads

---

## Journey Domain Model

The domain is centered around:

- rulesets
- game snapshot
- players
- rounds
- round entries
- map cells
- achievements

Important engine exports in [engine.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/engine.js:391):

- `normalizeJourneyGame`
- `createJourneyGame`
- `makeJourneyRound`
- `removeJourneyPlayer`
- `isJourneyGameOver`
- `getJourneyActivePlayers`
- `getJourneyFinishedPlayers`
- `getJourneyVisiblePlayers`
- `getJourneyResults`
- `calculateReceiptsDistribution`
- `getJourneyMapCell`
- `getJourneyCellLabel`
- `getJourneyPlayerTimeline`

Guidance:

- treat `engine.js` as the source of truth for game rules
- keep UI derivations thin
- if a rule changes, fix the engine first, then adapt UI
- avoid duplicating rule logic in `JourneyPage`

---

## Design System Rules

### 1. Use Theme Radii, Not Ad-Hoc Border Radius

Use `theme.customRadii.*` for component-level radius decisions.

Available semantic radii in [theme.js](/abs/path/C:/Users/anato/git/bk-app/frontend/src/theme.js:3):

- `xs`
- `sm`
- `md`
- `lg`
- `xl`
- `pill`
- `control`
- `surface`

Important MUI caveat:

- `sx={{ borderRadius: 12 }}` is **not** `12px`
- MUI multiplies numeric border radius by `theme.shape.borderRadius`
- use `theme.customRadii.*` or explicit strings like `"12px"`

Default preference:

- controls/inputs: `control`
- compact surfaces like log box: `surface`
- cards/dialogs: theme defaults or `md`/`lg`
- pills/chips/menu pills: `pill`

### 2. Reuse Shared UI Primitives

Prefer:

- `AppTextInput` for recurring text inputs
- `AppChip` for app-level chip styling
- `AppPillButton` for pill-style button actions
- `AppBreadcrumbs` for breadcrumb rows

If a new primitive repeats 2+ times and has styling semantics, extract it.

### 3. Prefer MUI Components Over Native HTML Controls

Examples:

- use `Select` + `MenuItem`, not native `<select>` through `TextField native`
- use MUI dialogs, chips, cards, buttons, inputs

### 4. Keep Layouts Intentional

This codebase currently uses:

- global app shell with sticky header
- page-level header card
- content grid
- left rail / main content split on desktop

When changing layout:

- preserve alignment between header and content containers
- keep desktop and mobile behavior explicit
- avoid introducing one-off spacing systems

---

## Copy and Text Rules

UI text should live in `src/texts` when it is:

- reused
- product-facing
- part of a major screen
- likely to change with product decisions

Prefer:

- `appHeaderTexts` for shell/header copy
- `journeyTexts` for journey page/domain copy

Avoid:

- scattering Russian UI copy through JSX
- duplicating the same label across files

Exception:

- low-level purely technical labels can remain local if truly one-off, but bias toward extraction

---

## Code Patterns

### Prefer Pure Helpers for Derived Logic

Good candidates:

- label formatting
- progress calculations
- mapping domain state to presentation state
- normalized summaries

Examples already used:

- `getAchievementProgress`
- `getHistoryEntrySummary`
- rules summary helpers

### Keep UI Components Thin Around the Engine

Bad:

- re-implementing move rules in JSX
- manually deciding edge cases already handled in `engine.js`

Good:

- call engine helpers
- render the resulting state

### Normalize at Boundaries

Boundaries:

- localStorage reads
- ruleset creation/update
- game snapshot loading

If raw external data can be malformed, normalize there.

### Use App-Level State Only When Necessary

Before lifting state to `App`, ask:

- is it needed by both `AppHeader` and routed pages?
- is it cross-route durable?
- is it shared app shell state?

If not, keep it inside the feature page.

---

## Design and UX Patterns

### Global Header

`AppHeader` is app shell, not page content.

It should contain:

- brand
- game navigation
- DJ name
- project/ruleset selector
- config access

It should not contain:

- game-specific controls that belong to one page only

### Page Header

`JourneyPage` page header should contain:

- breadcrumbs
- page title
- status chips
- page-level actions like `Правила`, `Новая игра`, `Восстановить`, `Сбросить`

### Status Chips

Status chips in `JourneyPage` are derived from actual game state.

Current logic:

- no game -> `Игра не начата`
- active game -> status + ruleset + round + players count
- completed game -> completion status + ruleset

If this logic changes, update the derivation in one place.

### Left Rail vs Main Column

Current desktop intent:

- left rail: inputs, control flow, game log
- main column: map, state, deep data

Keep that separation unless product explicitly changes it.

---

## Editing Rules for Common Tasks

### If You Change Visual Styling

1. check `theme.js`
2. check if a shared UI component should absorb the change
3. only then update page-specific `sx`

### If You Add or Change Copy

1. add/update in `src/texts`
2. wire into the consuming component
3. avoid inline duplication

### If You Change Game Rules

1. update `config.js` and/or `engine.js`
2. verify derived UI still makes sense
3. verify storage normalization still works
4. run `npm run build`

### If You Add a New Reusable Control

1. place it in `src/components/ui`
2. keep API small and style-focused
3. avoid domain coupling in shared UI primitives

### If You Add a New Game

Minimum expected surfaces:

1. route in `App.jsx`
2. nav item in `AppHeader.jsx`
3. page-level text dictionary
4. feature folder under `src/features/<game>`
5. clear separation between engine/config/storage/ui

Do not copy Journey blindly if the domain differs. Reuse the shell and shared UI, not the full feature structure by default.

---

## Known Transitional Areas

These areas are intentionally in transition:

- `/journey/config` is still route-based, but product direction points to broader global config
- rulesets are currently localStorage-based, but expected to move to backend
- DJ auth/name is inline text today, but expected to become API-driven later

When editing these areas:

- preserve current behavior
- avoid hard-coding assumptions that block backend migration
- prefer interfaces that can later be fed from API data

---

## Verification Checklist

After meaningful edits, check:

1. `npm run build`
2. no accidental raw numeric `borderRadius` in `sx` where px semantics matter
3. no duplicated product copy in JSX if the screen already uses `src/texts`
4. no game-rule logic duplicated outside `engine.js`
5. header/page alignment still matches across desktop widths

---

## Do / Don’t

Do:

- use shared UI primitives
- use `theme.customRadii`
- centralize text
- preserve the engine/storage/UI separation
- keep ruleset behavior backward compatible

Don’t:

- hardcode new UI copy in multiple places
- use native selects when MUI equivalents exist
- add raw numeric `borderRadius` casually in `sx`
- mutate game logic directly in the view layer
- make existing games depend on future backend assumptions

