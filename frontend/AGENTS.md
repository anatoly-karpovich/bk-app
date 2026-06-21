# AGENTS.md

## Purpose

This `frontend` app is a React + MUI operator panel for forum games.

Today the only implemented game is `Journey`, but the app shell is already moving toward a multi-game structure:

- global nav/header
- shared project/ruleset selection
- game-specific page headers
- reusable UI primitives

When editing this app, optimize for:

- preserving current Journey UI behavior while using backend-driven mutations
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
- TypeScript
- Browser storage via `localStorage`
- backend API via fetch

Entry points:

- [src/main.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/main.tsx:1)
- [src/App.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/App.tsx:1)

Build commands:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run typecheck`

Use `npm run build` and `npm run typecheck` as the minimum verification step after meaningful changes.

---

## Project Map

### Shell and App Structure

- [src/main.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/main.tsx:1)
  Mounts React, `ThemeProvider`, `CssBaseline`, and `BrowserRouter`.

- [src/App.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/App.tsx:1)
  Owns app-level state shared across routes:
  - DJ name
  - available journey rulesets
  - current default ruleset id

  It renders:
  - global header
  - route container
  - `JourneyPage`
  - transitional `JourneyRulesetsPage`

### Theme and Design System

- [src/theme.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/theme.ts:1)
  Single source of truth for:
  - palette
  - typography
  - base MUI overrides
  - semantic radii via `theme.customRadii`

- [src/types/mui.d.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/types/mui.d.ts:1)
  Type augmentation for custom MUI theme fields.

### Shared UI Components

- [src/components/ui/AppTextInput.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/components/ui/AppTextInput.tsx:1)
- [src/components/ui/AppChip.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/components/ui/AppChip.tsx:1)
- [src/components/ui/AppPillButton.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/components/ui/AppPillButton.tsx:1)
- [src/components/ui/AppBreadcrumbs.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/components/ui/AppBreadcrumbs.tsx:1)

These are the preferred primitives for repeated app-level UI patterns.

### Global Header

- [src/components/AppHeader.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/components/AppHeader.tsx:1)

Responsibilities:

- brand and game navigation
- mobile drawer
- DJ name input
- project/ruleset selector
- config entrypoint

### Journey Feature

- [src/features/journey/JourneyPage.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/JourneyPage.tsx:1)
  Thin page container that owns page-level state, runs async Journey API actions, derives feature models, and wires callbacks into feature components.

- [src/features/journey/api/journey.client.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/api/journey.client.ts:1)
  Fetch-based Journey API client. It consumes lean backend DTOs and normalizes them into the richer frontend shape used by existing helpers/components.

- [src/features/journey/journey-page.helpers.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/journey-page.helpers.ts:1)
  Pure UI-focused helpers for validation, compact map labels, history summaries, and achievement progress derivation.

- [src/features/journey/components/JourneyPageHeader.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/components/JourneyPageHeader.tsx:1)
- [src/features/journey/components/JourneyPlayersSetupCard.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/components/JourneyPlayersSetupCard.tsx:1)
- [src/features/journey/components/JourneyRoundControlsCard.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/components/JourneyRoundControlsCard.tsx:1)
- [src/features/journey/components/JourneyLogCard.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/components/JourneyLogCard.tsx:1)
- [src/features/journey/components/JourneyResultsCard.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/components/JourneyResultsCard.tsx:1)
- [src/features/journey/components/JourneyMapCard.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/components/JourneyMapCard.tsx:1)
- [src/features/journey/components/JourneyStateCard.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/components/JourneyStateCard.tsx:1)
- [src/features/journey/components/JourneyRulesDialog.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/components/JourneyRulesDialog.tsx:1)
- [src/features/journey/components/JourneyImportDialog.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/components/JourneyImportDialog.tsx:1)

Feature-local components should stay inside `src/features/journey/components` unless they become clearly reusable outside the Journey feature.

- [src/features/journey/JourneyRulesetsPage.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/JourneyRulesetsPage.tsx:1)
  Transitional config page for rulesets. Still active, but conceptually moving toward a broader config surface.

- [src/features/journey/engine.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/engine.ts:1)
  Transitional Journey domain/normalization layer. Frontend no longer owns authoritative Journey mutations, but this file still powers derivations, normalization, and view helpers.

- [src/features/journey/config.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/config.ts:1)
  Built-in rulesets, normalization, config derivation, and achievements metadata.

- [src/features/journey/storage.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/storage.ts:1)
  `localStorage` boundary for Journey `gameId`, rulesets, and default ruleset selection.

- [src/features/journey/parsers.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/parsers.ts:1)
  Forum text parsing for players and moves.

- [src/features/journey/commentTemplates.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/commentTemplates.ts:1)
  Comment/log text generation support.

- [src/features/journey/types.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/types.ts:1)
  Feature domain and view-model types.

### Text Dictionaries

- [src/texts/appHeaderTexts.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/texts/appHeaderTexts.ts:1)
- [src/texts/journeyTexts.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/texts/journeyTexts.ts:1)

Prefer adding/editing UI copy here instead of hardcoding strings in JSX.

---

## Routing

Current routes in [src/App.tsx](/abs/path/C:/Users/anato/git/bk-app/frontend/src/App.tsx:1):

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
- changing the default ruleset in the header must be reflected across routes

### Journey Page State

Owned by `JourneyPage`:

- current game snapshot
- player name draft list
- imported forum text
- current round inputs
- skip toggles
- dialog open state

Owned by feature-local child components:

- map hover state in `JourneyMapCard`
- expanded player row state in `JourneyStateCard`

Rule of thumb:

- transient local interaction state should stay as close as practical to the component that uses it
- durable cross-route state stays in `App`
- Journey API mutations stay in `JourneyPage` via `journey.client.ts`
- pure derivations and normalization stay in `engine.ts`
- persistence stays in `storage.ts`

### Ruleset Behavior

Critical product rule:

- `default ruleset` affects only new games
- an already started game keeps its own rules snapshot

This behavior is encoded in the current architecture. Do not break it.

---

## Storage Model

Storage keys in [storage.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/storage.ts:1):

- `combats-dj:journey`
- `combats-dj:journey:rulesets`
- `combats-dj:journey:default-ruleset-id`
- `combats-dj:dj-name` is managed in `App.tsx`

Important behaviors:

- only the current `gameId` is stored locally for Journey restore
- custom rulesets are normalized when read/write
- built-in rulesets always win on id collisions
- deleting the default custom ruleset falls back to the built-in default
- Journey API responses are normalized before entering page state

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

Important current architecture:

- backend is the source of truth for Journey mutations and stored game state
- frontend still uses local helpers for display-oriented derivations
- backend returns a lean DTO, which the frontend normalizes into its richer internal shape

Important engine exports in [engine.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/features/journey/engine.ts:1):

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

- treat backend + backend engine as the source of truth for game mutations
- treat frontend `engine.ts` as a derived helper/normalization layer
- keep UI derivations thin
- if a rule changes, update backend domain logic first, then adapt frontend normalization/UI
- avoid duplicating rule logic in `JourneyPage` or child components

---

## Design System Rules

### 1. Use Theme Radii, Not Ad-Hoc Border Radius

Use `theme.customRadii.*` for component-level radius decisions.

Available semantic radii in [theme.ts](/abs/path/C:/Users/anato/git/bk-app/frontend/src/theme.ts:1):

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

If a new primitive repeats 2+ times and is style-oriented rather than Journey-specific, extract it.

### 3. Prefer MUI Components Over Native HTML Controls

Examples:

- use `Select` + `MenuItem`, not a native `<select>`
- use MUI dialogs, chips, cards, buttons, and inputs

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
- `journeyTexts` for Journey page/domain copy

Avoid:

- scattering product copy through JSX
- duplicating the same label across files

Exception:

- low-level technical labels can remain local if truly one-off, but bias toward extraction

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
- compact map label/tone helpers

### Keep UI Components Thin Around the Engine

Bad:

- re-implementing move rules in JSX
- manually deciding edge cases already handled in `engine.ts`

Good:

- call engine helpers
- render the resulting state

### Normalize at Boundaries

Boundaries:

- `localStorage` reads
- ruleset creation/update
- game snapshot loading

If raw external data can be malformed, normalize there.

### Use App-Level State Only When Necessary

Before lifting state to `App`, ask:

- is it needed by both `AppHeader` and routed pages?
- is it cross-route durable?
- is it shared app shell state?

If not, keep it inside the relevant feature page or local feature component.

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

The Journey page header should contain:

- breadcrumbs
- page title
- status chips
- page-level actions such as rules, new game, restore, and reset

### Status Chips

Status chips on the Journey page are derived from actual game state.

Current logic:

- no game -> not started status + ruleset
- active game -> active status + ruleset + round + player count
- completed game -> completion status + ruleset

If this logic changes, update the derivation in one place.

### Left Rail vs Main Column

Current desktop intent:

- left rail: setup/round controls, results, game log
- main column: map, state, deep player data

Keep that separation unless product explicitly changes it.

---

## Editing Rules for Common Tasks

### If You Change Visual Styling

1. check `theme.ts`
2. check if a shared UI component should absorb the change
3. only then update page-specific `sx`

### If You Add or Change Copy

1. add/update in `src/texts`
2. wire into the consuming component
3. avoid inline duplication

### If You Change Game Rules

1. update `config.ts` and/or `engine.ts`
2. verify derived UI still makes sense
3. verify storage normalization still works
4. run `npm run build`
5. run `npm run typecheck`

### If You Add a New Reusable Control

1. place it in `src/components/ui`
2. keep the API small and style-focused
3. avoid domain coupling in shared UI primitives

### If You Add a New Journey-Only UI Block

1. place it under `src/features/journey/components`
2. keep it presentation-focused
3. keep domain mutations in `JourneyPage`, helpers, or the engine unless the component truly owns local interaction state

### If You Add a New Game

Minimum expected surfaces:

1. route in `App.tsx`
2. nav item in `AppHeader.tsx`
3. page-level text dictionary
4. feature folder under `src/features/<game>`
5. clear separation between engine/config/storage/ui

Do not copy Journey blindly if the domain differs. Reuse the shell and shared UI, not the entire feature structure by default.

---

## Known Transitional Areas

These areas are intentionally in transition:

- `/journey/config` is still route-based, but product direction points to broader global config
- rulesets are currently `localStorage`-based, but expected to move to backend
- DJ auth/name is inline text today, but expected to become API-driven later
- Journey page still normalizes richer internal models from a lean backend DTO
- frontend still carries legacy Journey engine structures for compatibility with existing UI helpers

When editing these areas:

- preserve current behavior
- avoid hard-coding assumptions that block backend migration
- prefer interfaces that can later be fed from API data

---

## Verification Checklist

After meaningful edits, check:

1. `npm run build`
2. `npm run typecheck`
3. no accidental raw numeric `borderRadius` in `sx` where px semantics matter
4. no duplicated product copy in JSX if the screen already uses `src/texts`
5. no game-rule logic duplicated outside `engine.ts`
6. header/page alignment still matches across desktop widths

---

## Do / Don't

Do:

- use shared UI primitives
- use `theme.customRadii`
- centralize text
- preserve the engine/storage/UI separation
- keep ruleset behavior backward compatible

Don't:

- hardcode new UI copy in multiple places
- use native selects when MUI equivalents exist
- add raw numeric `borderRadius` casually in `sx`
- mutate game logic directly in the view layer
- make existing games depend on future backend assumptions
