# AGENTS.md - Frontend

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
  projects/
    api/
    components/
    hooks/
    projectPage.helpers.ts
    ProjectPage.tsx
  configs/
    components/
    hooks/
    GameConfigsPage.tsx
    JourneyConfigPage.tsx
  journey/
    api/
    components/
    hooks/
    mappers/
    storage.ts
    types.ts
  battleships/
    api/
    components/
    hooks/
    mappers/
    storage.ts
    types.ts
  lotto/
    api/
    components/
    hooks/
    mappers/
    storage.ts
    types.ts
  rewards/
    types.ts
    resourceAmounts.ts
components/
  players/
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

Journey full-game responses use `JourneyGameView`. The API client maps it structurally to the page model; this mapping must not recreate player groups, results, achievement progress, timelines, or other game rules from raw rounds.

When two or more features share the same page shell, dialog structure, or presentational block, prefer moving that structure into a shared component instead of maintaining near-identical copies under each feature.

If multiple game pages need breadcrumbs or other framing/navigation UI, do not keep separate hardcoded breadcrumb strings in feature texts. Prefer one shared component with consistent logic and shared source labels.

Breadcrumbs are defined through `PageBreadcrumbs` and `components/ui/AppBreadcrumbs`. Pass semantic items with a `label` and optional `to` route, rather than rendering page-local links. Link only ancestors that have a real React Router destination; the current page and non-page navigation groups remain text. For a nested config editor, link the config-list parent and the corresponding game-type filter (`/configs?gameType=...`), while leaving the current config name unlinked. `GameConfigsPage` reads that query parameter so breadcrumb navigation restores the selected game type.

When multiple setup flows need the same visual treatment for player nickname fields, prefer one shared component for that visual primitive. At the moment `components/players/GamePlayerNameInput.tsx` is the shared source for the player-name input look.

## Shared component workflow

When adding or changing a game page, always look for an existing shared component before writing local UI.

Use this order:

1. Check `src/components/` and `src/components/ui/` for a component with the same semantic role.
2. If there is no shared component, inspect the equivalent UI in Journey, Battleships, and Lotto.
3. If the same UI or interaction exists in another game, extract or move it into `src/components/` or `src/components/ui/` as part of the same change, then use that shared source in every applicable game.
4. Create a feature-local component only when the structure or behavior is genuinely game-specific.

Do not fork a component merely because its text, icon, disabled state, or callback differs. Pass those details as props when the visual role is the same.

Current shared sources include:

* `components/GamePageHeader.tsx` for the game-page frame and host actions.
* `components/players/GamePlayerNameInput.tsx` for player-name inputs.
* `components/GameStartButton.tsx` for starting a new game.
* `components/GameActionButton.tsx` for compact icon-and-label game actions.
* `components/AddPlayerButton.tsx` for the standard `+ Добавить` player action.
* `components/ui/AppInfoAlert.tsx` for neutral blue informational messages with the standard `i` icon. Do not use it for errors, warnings, or success messages.
* `components/ui/AppPillButton.tsx`, `AppTextInput.tsx`, `AppChip.tsx`, `AppConfirmDialog.tsx`, `AppBreadcrumbs.tsx`, and `AppResponsiveGrid.tsx` for their corresponding UI primitives.

Keep shared components presentational and configurable. Feature components retain game-specific copy and callbacks; shared components own repeated markup and visual rules.

For nested host pages, use `GamePageHeader` and its breadcrumb extension rather than creating page-local breadcrumb implementations.

Use `AppTextInput` change-state styling only for a meaningful comparison between a local draft and its saved source. Reuse `AppSelectableListItem` trailing content for status markers rather than forking the list-item layout.

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

The same principle applies to `BattleshipsPage.tsx` and `LottoPage.tsx`.

For Battleships and Lotto, page-level orchestration should continue living in:

```text
features/battleships/hooks/useBattleshipsGame.ts
features/lotto/hooks/useLottoGame.ts
```

Do not let `BattleshipsPage.tsx` or `LottoPage.tsx` accumulate engine-like decision logic.

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

This applies equally to Journey, Battleships, Lotto, and future games.

Specific frontend boundary reminders:

* Battleships frontend must not generate the final board, resolve reward pools, calculate prizes, or decide when the game is over. It displays saved grants and totals returned by backend.
* Lotto frontend must not decide draw order, winner placement, resolve reward pools, distribute payouts, or build final legacy summary text. It displays saved payouts returned by backend.
* Lotto may contain setup-only helpers for host convenience, for example draft number generation before game creation, but backend validation and final rules remain authoritative.

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
features/projects/api/projects.client.ts
```

Current baseline:

```text
src/lib/apiClient.ts
features/projects/hooks/useProjects.ts
features/journey/hooks/useJourneyGame.ts
features/battleships/hooks/useBattleshipsGame.ts
features/lotto/hooks/useLottoGame.ts
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

## Projects and presets

The frontend consumes project-scoped APIs. `features/configs` is the host-facing UI for project-owned `GameConfig` presets; it must use project-scoped routes and must not introduce a global `/api/configs` source of truth.

- Load the active project through `features/projects` and load presets by project + game type.
- Create, restore, mutate, and delete games only through `/api/projects/:projectId/...` routes.
- Persist only lightweight selected project/preset identifiers; never persist project data, preset rules, resources, or game state as a source of truth.
- Display resources from the project or a game snapshot returned by backend. Do not recreate resource defaults per feature.
- Reuse shared `features/rewards` reward-pool types and amount-formatting helpers, plus `features/configs/components/RewardPoolEditor`, when a game needs them. Game-specific components may choose their labels and layout, but must not duplicate pool mechanics or local prize calculation.
- If project/preset management UI is added, it must use Project/GameConfig CRUD and permanent-delete semantics. Archive, restore, duplicate, versioning, and optimistic locking are out of MVP.

### Game configuration editors

- `GameConfigsPage.tsx` owns preset listing, filtering, and navigation. A complex game-specific preset may use its own page under `/configs/:gameType/:configId`; keep the list page focused on browsing and selection.
- A config editor keeps a saved source snapshot and one local draft. Field edits update only the draft; saving is one explicit API request.
- Reset restores the draft from the saved snapshot. After a successful save, replace both the source snapshot and the draft with the returned backend config.
- Track unsaved changes by comparing the draft with the saved snapshot. Section-level indicators must reflect semantic changes, including additions and removals, and disappear after reset or successful save.
- Backend remains authoritative for validation and rule semantics. The editor may expose only supported fields and must display API validation failures instead of inventing local fallback rules.
- Game-owned invariant fields, such as achievement conditions or protected core cell identities, are display-only or disabled unless backend support explicitly makes them configurable.
- Read reward resources from the selected project and reuse `features/rewards` types, formatters, and `RewardPoolEditor`; never recreate resource defaults or pool mechanics locally.

### Project Settings page

`features/projects/ProjectPage.tsx` is the host-facing editor for project identity and its resource catalog.

- Keep one local `ProjectDraft` for unsaved edits and one selected resource id for the editor context. Adding, selecting, or removing a draft resource must not persist data until the explicit save action succeeds.
- Present one selected-resource editor, not a grid of editors for every resource. Keep project-specific presentation in `features/projects/components/` (`ProjectResourceList`, `ProjectResourceEditor`, and `ProjectResourceUsage`). Do not generalize these components until another feature needs the same semantic UI.
- Load config usage through existing project/config APIs and show it as display-only context. Do not duplicate or mutate game rules in this page.
- Use the same top-level `Grid container spacing={3}` composition as Journey, Battleships, and Lotto. Do not wrap the page in an extra layout that changes the shared 24px column gap or its alignment with `GamePageHeader`.
- Use `GamePageHeader`, default themed `Card`/`CardContent`, `h5` card headings, and the shared UI primitives. Do not introduce project-only variants for standard cards, buttons, chips, inputs, or alerts.

---

## OOP preference

For frontend UI components, idiomatic React functions are fine.

For services and clients, classes are preferred when they improve ownership and readability.

Good:

```ts
export class ProjectsApiClient {
  async getProjects() {}
  async updateProject(projectId: string, payload: unknown) {}
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
* coordinate host tools such as saved games dialogs, remove-player confirms, and draft setup inputs

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

Feature-level identifiers shared by pages, hooks, and texts belong in a feature type or constants module, not in a React component. Text modules may import pure types, but must not depend on component modules.

Do not restore Journey's removed legacy DTOs (`JourneyGame`, `JourneyRound`, `movesHistory`, `derived`) or infer storage format in the frontend. Consume the public view contract and its page-local structural mapper instead.

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
texts/lottoTexts.ts
texts/projectTexts.ts
```

Keep Battleships, Lotto, and Project Settings copy in their dedicated text files rather than scattering strings through pages, cards, or helpers. Project Settings uses `texts/projectTexts.ts` for labels, statuses, accessibility text, and config-usage copy.

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

Use `AppResponsiveGrid` for responsive layouts nested inside cards, config sections, or other padded surfaces. Do not use MUI legacy `Grid container spacing` in those contexts: its compensating margins and width can create double left padding and right overflow. Reserve MUI `Grid` for top-level page layout where the shared page gutter is intentional.

Current shared UI patterns that should stay consistent across Battleships and Lotto unless a task explicitly changes them:

* shared page header structure via `GamePageHeader`
* shared player-name input styling via `GamePlayerNameInput`
* shared confirm dialog and saved-game action vocabulary
* saved-games presentation that surfaces project/config context and host metadata clearly

Project Settings follows the same visual system: its header uses `GamePageHeader`; the root grid uses `spacing={3}`; standard cards use the themed MUI defaults; and `h5` is the shared card-title scale already used by game `CardHeader`s. Extend `theme.ts` only for a rule used by more than one feature; do not move project-specific selectable-resource or preview styles into the global theme.

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

1. Keep Journey, Battleships, Lotto, and project/preset orchestration inside feature hooks.
2. Prefer backend read-model fields over recreating derived game/config state in React.
3. Move display transformations into mappers/view-model helpers.
4. Keep game cards presentational.
5. Keep future project/preset management UI focused on API-backed editing, not config ownership.
6. Gradually eliminate localStorage except for game id or UI preferences.
7. Remove stale legacy DTO/helpers when they are no longer referenced.
8. Preserve host-facing UX details already implemented in Battleships and Lotto, such as restore/delete flows, visible DJ metadata, and copy-friendly result surfaces.

The goal is not to make React clever.

The goal is to make React simple.
