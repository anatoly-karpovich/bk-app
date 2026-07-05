# AGENTS.md — Frontend

## Project context

This frontend is the React version of the BK radio/forum games application.

The old implementation lives in:

```text
LEGACY/
```

The current frontend lives in:

```text
frontend/src/
```

Current feature structure includes:

```text
features/
  configs/
    hooks/
  journey/
    api/
    components/
    hooks/
    mappers/
components/
texts/
theme.ts
```

The app is being migrated away from vanilla JavaScript and localStorage-driven game state.

The frontend should become a thin UI layer over backend-owned game state and game rules.

---

## Tech stack

* React
* TypeScript
* Vite
* MUI
* Feature-based structure

---

## Architecture direction

Prefer feature-based frontend architecture.

Recommended structure for each feature:

```text
features/
  journey/
    api/
    components/
    hooks/
    mappers/
    storage.ts
    types.ts
    JourneyPage.tsx
```

Recommended responsibilities:

```text
Page component     -> page composition and high-level orchestration
Components         -> presentational UI
Hooks              -> local UI orchestration and API calls
API client         -> HTTP requests only
Mappers/helpers    -> transform backend data for display
Storage            -> lightweight browser persistence only
Types              -> frontend DTO/view-model types
```

When two or more features share the same page shell, dialog structure, or presentational block, prefer moving that structure into a shared component instead of maintaining near-identical copies under each feature.

If multiple game pages need breadcrumbs or other framing/navigation UI, do not keep separate hardcoded breadcrumb strings in feature texts. Prefer one shared component with consistent logic and shared source labels.

---

## React component rules

React components should not contain game business logic.

Good component responsibilities:

* render UI
* call hooks/actions
* show loading/error states
* pass props to child components
* handle simple UI events

Avoid components that contain:

* round calculation
* player movement logic
* winner calculation
* config-based game decisions
* large parsing flows
* backend state mutation rules

If a component grows too large, extract:

```text
useJourneyGame.ts
journey-page.helpers.ts
journey.mapper.ts
smaller presentational components
```

---

## JourneyPage rule

`JourneyPage.tsx` should not become the application brain.

If adding new behavior to Journey, prefer extracting it into:

```text
features/journey/hooks/useJourneyGame.ts
features/journey/mappers/journey.mapper.ts
features/journey/api/journey.client.ts
```

Target shape:

```ts
const {
  game,
  loading,
  error,
  actions,
  viewModel,
} = useJourneyGame();
```

The page should mostly compose cards and dialogs.

---

## Business logic boundary

Backend owns game rules.

Frontend may contain display-only logic.

Allowed in frontend:

```ts
formatRoundTitle(...)
getPlayerDisplayName(...)
mapJourneyGameToViewModel(...)
sortPlayersForDisplay(...)
```

Not allowed in frontend:

```ts
createJourneyGame(...)
makeJourneyRound(...)
removeJourneyPlayer(...)
buildMove(...)
createMap(...)
refreshGameIndexes(...)
```

If a function changes the real game result, move it to backend.

---

## API clients

Keep API clients small and boring.

Good:

```ts
export class JourneyApiClient {
  async createGame(payload: CreateJourneyGameRequest) {}
  async getGame(gameId: string) {}
  async submitRound(gameId: string, payload: SubmitRoundRequest) {}
}
```

Avoid mixing API calls with UI logic, localStorage, parsing, or notifications.

Long-term direction:

```text
src/lib/apiClient.ts
features/journey/api/journey.client.ts
features/configs/api/config.client.ts
```

Current baseline:

```text
src/lib/apiClient.ts
features/configs/hooks/useConfigs.ts
features/journey/hooks/useJourneyGame.ts
```

Common HTTP behavior should live in a shared API client:

* base URL
* JSON parsing
* error handling
* headers
* response validation if added later

---

## LocalStorage policy

Do not use localStorage as a database.

Allowed localStorage usage:

* current game id
* theme
* UI preferences
* temporary draft text if explicitly needed

Not allowed:

* full game state
* players as source of truth
* rounds as source of truth
* configs as source of truth
* calculated results

The backend is the source of truth for game data.

---

## Configs

Frontend may edit and display configs, but should not own default game configs.

Avoid duplicating backend config defaults in frontend.

Frontend config code should focus on:

* loading configs
* rendering config forms
* sending updates to backend
* mapping backend config read-model into UI-friendly structures

Journey config summaries should come from backend read-model fields such as:

```ts
config.journeySummary
```

---

## OOP preference

For frontend UI components, idiomatic React functions are fine.

For services and clients, classes are preferred when they improve ownership and readability.

Good:

```ts
export class ConfigApiClient {
  async getConfigs() {}
  async updateConfig(key: string, payload: unknown) {}
}
```

Good:

```ts
export class JourneyViewMapper {
  toViewModel(game: JourneyGameDto): JourneyViewModel {}
}
```

Avoid turning domain-heavy frontend code into many unrelated standalone functions when a class would make ownership clearer.

---

## Hooks

Hooks are for React orchestration, not domain rules.

Good hook responsibilities:

* load game
* call API client
* manage loading/error state
* expose UI actions
* coordinate dialogs and forms

Bad hook responsibilities:

* calculate game results
* mutate game rules locally
* duplicate backend engine logic

---

## Types

Keep frontend types close to API contracts and view models.

Recommended distinction:

```text
types.ts
  API DTOs
  View models
  Component props
```

Avoid using `any`.

Avoid creating frontend types that silently diverge from backend response shape.

If backend DTOs become stable, consider a shared contract package later.

---

## Texts and UI copy

Texts are already separated under:

```text
src/texts/
```

Keep UI strings out of deeply nested components when they are reused or domain-specific.

Good:

```text
texts/journeyTexts.ts
texts/appHeaderTexts.ts
```

---

## Styling and UI

Use existing MUI theme and shared UI components.

Prefer shared components from:

```text
components/ui/
```

when adding buttons, chips, text inputs, breadcrumbs, or repeated UI primitives.

If a repeated structure grows beyond a primitive, for example page headers, saved-game dialogs, summary cards, or other reusable feature shells, extract it into a shared component under:

```text
src/components/
```

Feature wrappers may still adapt shared components with feature-specific texts and actions, but should not fork the layout without a clear reason.

Avoid one-off styling unless the component is truly unique.

Keep the current visual style consistent.

---

## Migration rules

When migrating from `LEGACY/`:

1. Preserve user-facing behavior first.
2. Move game state to backend.
3. Move game rules to backend.
4. Keep React responsible for rendering and interaction.
5. Remove localStorage-based game persistence.
6. Split large pages into components/hooks.
7. Avoid copying legacy procedural logic directly into React.

---

## What to avoid

Avoid:

* duplicating backend engine logic
* duplicating the same presentational layout across multiple game features after the second occurrence
* large `useEffect` chains
* huge page components
* excessive `useMemo` and `useCallback` without real need
* derived state stored as independent state
* localStorage as source of truth
* API calls scattered directly across components
* hardcoded config defaults in frontend
* business logic inside MUI cards/dialogs

---

## Preferred next refactorings

When improving the frontend, prioritize:

1. Keep Journey and Configs orchestration inside feature hooks.
2. Prefer backend read-model fields over recreating derived game/config state in React.
3. Move display transformations into mappers/view-model helpers.
4. Keep Journey cards presentational.
5. Keep Configs page focused on config editing, not config ownership.
6. Gradually eliminate localStorage except for game id or UI preferences.
7. Remove stale legacy DTO/helpers when they are no longer referenced.

The goal is not to make React clever.

The goal is to make React simple.
