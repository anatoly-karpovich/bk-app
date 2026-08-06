# AGENTS.md - Backend

## Project context

This backend powers BK radio/forum games. The project is being migrated from the old vanilla JavaScript implementation in `LEGACY/` to a React + backend architecture.

The backend must become the source of truth for:

- game state
- game rules
- game configs
- project resources (currencies and items)
- parsing and domain transformations
- persistent data

The frontend should not duplicate backend business logic.

---

## Tech stack

- TypeScript
- Node.js
- Express
- MongoDB
- Modular architecture

Current backend structure:

```text
src/
  server.ts
  app/
  bootstrap/
  common/
  infrastructure/
  modules/
    projects/
      ProjectsController.ts
      ProjectsRepository.ts
      ProjectsService.ts
      projects.routes.ts
      projects.schemas.ts
    gameConfigs/
      GameConfigsController.ts
      GameConfigsRepository.ts
      GameConfigsService.ts
      gameConfigs.routes.ts
      gameConfigs.schemas.ts
      domain/
      errors/
    journey/
      JourneyController.ts
      JourneyV2Engine.ts
      JourneyParser.ts
      JourneyReadModelFactory.ts
      JourneyRepository.ts
      JourneyService.ts
      journey.routes.ts
      journey.schemas.ts
      domain/
      errors/
    battleships/
      BattleshipsController.ts
      BattleshipsEngine.ts
      BattleshipsReadModelFactory.ts
      BattleshipsRepository.ts
      BattleshipsService.ts
      battleships.routes.ts
      battleships.schemas.ts
      domain/
      errors/
    lotto/
      LottoController.ts
      LottoEngine.ts
      LottoReadModelFactory.ts
      LottoRepository.ts
      LottoService.ts
      lotto.routes.ts
      lotto.schemas.ts
      domain/
      errors/
    quizzes/
      QuizConfigsController.ts
      QuizConfigsService.ts
      QuizConfigsRepository.ts
      QuizzesController.ts
      QuizzesService.ts
      QuizzesRepository.ts
      QuizEventsController.ts
      QuizEventsService/
      QuizEventsRepository.ts
      QuizConfigReadModelFactory.ts
      QuizReadModelFactory.ts
      QuizEventReadModelFactory.ts
      quizzes.routes.ts
      quizzes.schemas.ts
      domain/
    forumTopic/
      ForumTopicController.ts
      ForumTopicService.ts
      forumTopic.routes.ts
      forumTopic.schemas.ts
```

---

## Architecture direction

Prefer clear enterprise-style TypeScript architecture.

Use this target structure for every backend module:

```text
modules/
  module-name/
    ModuleController.ts
    ModuleService.ts
    ModuleRepository.ts
    module.routes.ts
    module.schemas.ts
    domain/
    errors/
```

Folder-based substructure is still acceptable inside `domain/` or for supporting files, but new backend code should prefer the flat module layout above over legacy `controllers/`, `services/`, and `routes/` subfolders.

Recommended responsibilities:

```text
Controller    -> HTTP layer only
Service       -> use cases and orchestration
Repository    -> database access
Engine        -> pure game rules and domain logic
Domain types  -> game entities, DTOs, config types
Parsers       -> text/input parsing
```

Avoid putting MongoDB calls directly inside controllers.

Avoid putting HTTP concerns inside domain logic.

Avoid creating repositories, services, or controllers inside route files.

Dependencies should be assembled in one composition root and then injected downward.

---

## Bootstrap and environment order

Backend startup order matters.

Required rule:

1. load environment
2. initialize infrastructure/bootstrap dependencies
3. create the Express app
4. register routes
5. start listening

Do not create infrastructure-backed dependencies at module import time if that depends on environment state or external services.

`createApp()` must stay side-effect light. It may assemble the HTTP app from already-valid bootstrap state, but it must not rely on accidental import order.

Use one shared environment loader helper. Do not scatter `process.loadEnvFile()` calls across unrelated files.

---

## Composition root

The backend should have one explicit composition root responsible for wiring:

- Mongo connection/database access
- repositories
- services
- controllers
- route registration

Route files should only map controller methods to HTTP paths.

They must not instantiate repositories, services, controllers, or bootstrap infrastructure on their own.

---

## Coding style preferences

Prefer OOP for domain-heavy backend code.

Good:

```ts
export class JourneyService {
  constructor(
    private readonly repository: JourneyRepository,
    private readonly engine: JourneyV2Engine,
  ) {}

  async submitRound(gameId: string, input: SubmitRoundDto) {
    const game = await this.repository.findById(gameId);
    const updatedGame = this.engine.makeRound(game, input.moves, input.skippedPlayerIds);
    return this.repository.save(updatedGame);
  }
}
```

Avoid growing the backend as a collection of unrelated exported functions when the code represents a domain concept.

Utility functions are fine for small stateless helpers, but game engines, services, repositories, config services, and parsers should be modeled as classes when it improves readability and ownership.

Legacy function-based files may remain as internal implementation detail during migration, but new application-layer code should depend on classes, not on exported procedural service modules.

---

## Domain rules

The backend is the owner of game rules.

Do not duplicate rules in frontend files such as:

```text
frontend/src/features/*/engine.ts
```

Frontend may contain:

- API clients
- view mappers
- UI helpers
- formatting helpers
- derived display data

Frontend must not contain:

- winner calculation
- player movement rules
- round resolution
- game state mutation rules
- config-driven business decisions

If a rule affects the final game result, it belongs to the backend.

---

## Journey module expectations

Current Journey module contains:

```text
modules/journey/domain/engine.ts
modules/journey/domain/types.ts
modules/journey/domain/config.ts
modules/journey/domain/parsers.ts
modules/journey/domain/commentTemplates.ts
modules/journey/services/journey.service.ts
modules/journey/controllers/journey.controller.ts
modules/journey/routes/journey.routes.ts
```

Keep this direction, but the target shape is:

```text
modules/journey/
  JourneyController.ts
  JourneyService.ts
  JourneyRepository.ts
  JourneyV2Engine.ts
```

`JourneyService` and `JourneyController` should depend on `JourneyV2Engine`, `JourneyParser`, `JourneyRepository`, and read-model classes rather than on procedural service wrappers. `domain/engine.ts` is offline legacy normalization code for backup import only.

`JourneyV2Engine` should be the only runtime place that knows how to:

- create a Journey game
- create the map
- create players
- remove players
- build moves
- resolve rounds
- refresh indexes
- calculate final state

Runtime Journey games use only `JourneyV2Game`. The legacy Journey normalizer exists solely for the offline backup-import script and must not be injected into the application or used to serve/mutate games.

All Journey game reads return `JourneyGameView`, built from compact V2 state. Do not expose raw persisted `rounds`, player `movesHistory`, V1 aliases, or a storage discriminator. `JourneyReadModelFactory` owns API projection; the frontend must receive ready-made player groupings, achievement progress, timelines, and forum log.

`domain/commentTemplates.ts` accepts storage-agnostic move/achievement comment events. Keep templates gender-inclusive for player actions (`нашёл(-ла)`, `потерял(-а)`, `осмотрелся(-ась)`); do not make a template depend on a V1 or V2 player object.

The same principle applies to Battleships and Lotto: their engines own the game-result logic, while controllers and services stay at orchestration level.

## Shared rewards and resources

`modules/rewards` owns reusable reward value types, reward-pool validation, and `RewardGrantService`. `RewardGrantService` resolves only what dropped from an `all`, `weighted_one`, or `independent` pool; it must be injected into engines through the composition root.

It must not know a game's players, balances, limits, recipient policy, or persistence. Game domains own those rules and persist the resolved outcome:

- Journey applies its own inventory limits and balances. Limits apply only to ordinary map-cell rewards; initial rewards, jackpots, and achievement rewards bypass them.
- Journey keeps each resolved grant in the game state. Its read model and forum state must total the limited base reward plus the saved achievement and jackpot grants; never infer bonus values from a mutable preset or reroll a pool.
- Journey forum state prints a player's saved achievement and jackpot grants as a separate readable bonus list beneath the total reward.
- A limited Journey map-cell reward is described only by its `MOVE_TYPES.AT_MAX` or `MOVE_TYPES.TO_MAX` comment. Do not add a separate limit comment; retained legacy limit-template references exist only to render old saved snapshots.
- Battleships resolves pools at hit/destroy triggers, stores grants and cumulative results, and undo restores saved state without rerolling.
- Lotto resolves each prize group once, uses `LottoPayoutDistributor` to assign its saved result to recipients, and reads prize tables from persisted payouts. A split pool with item rewards is invalid until an explicit item-distribution policy exists.

Do not create a generic reward application service that absorbs these game policies. Shared stateless helpers are appropriate for common resource arithmetic or pool validation; use domain classes for game-specific distribution policies.

## Battleships module expectations

Battleships should keep the same ownership split:

```text
modules/battleships/
  BattleshipsController.ts
  BattleshipsService.ts
  BattleshipsRepository.ts
  BattleshipsEngine.ts
  BattleshipsReadModelFactory.ts
```

The Battleships engine should be the only place that knows how to:

- normalize battleships rules
- generate the board and ship placement
- apply a shot
- undo the last shot
- resolve hit/destroy reward pools and persist their grants
- calculate cumulative prize results
- determine attempts left and finished state

The Battleships read-model factory is the correct place for host-facing derived fields such as visible board cells, coordinate labels, fleet summary, and saved prize snapshots. It must not resolve pools again.

## Lotto module expectations

Lotto should keep the same ownership split:

```text
modules/lotto/
  LottoController.ts
  LottoService.ts
  LottoRepository.ts
  LottoEngine.ts
  LottoReadModelFactory.ts
```

The Lotto engine should be the only place that knows how to:

- normalize lotto rules
- validate player cards against range and uniqueness rules
- maintain the available-number pool and draw order
- remove players from an active game
- determine when the game is finished
- resolve first-place and second-place winners
- resolve prize pools once per winner group and persist payouts
- build the legacy grouped summary of remaining numbers

The Lotto read-model factory is the correct place for host-facing derived fields such as prize tables from saved payouts, visible winner groups, event ordering for UI, and saved-game metadata. It must not recalculate prize allocation from rules.

## Quizzes module expectations

Quizzes has three related, but distinct, project-scoped entities:

- `QuizConfig` is an editable reward and message-template preset;
- `Quiz` is an editable question set created from a config snapshot;
- `QuizEvent` is one runtime conduct of a Quiz.

Keep their ownership and persisted snapshots explicit:

- A Quiz snapshots the selected config rules and only the project resources used by those rules. It must remain interpretable if the project catalog or source config later changes.
- A Quiz Event snapshots the Quiz, its resources, and its config rules. Its results must be rendered from that saved snapshot, never by re-reading mutable project/config data.
- A Quiz with an attached event is no longer editable or deletable. Do not bypass this lifecycle rule with a generic document update.
- A Quiz Event owns its own optimistic-concurrency `revision`. Every event mutation must require the expected revision and persist the incremented result atomically.

`QuizEventEngine` owns all conduct rules: assigning conducted order, validating selected answers, ranking answers, resolving regular and bonus awards, resetting invalidated results, completing/reopening an event, and rebuilding its saved summary. The frontend must not recreate any of these decisions.

Chat parsing is an input pipeline, not a frontend concern:

- `ChatParser` parses raw text;
- `QuizMessageCandidateFilter` limits messages to the host and allowed transports;
- `ChatMessageDeduplicator` removes repeated messages;
- `QuizSelectedAnswerPruner` removes selections invalidated by a chat replacement.

Keep the raw editable chat and materialized source messages in persistence, but expose only the public workspace required by the host: raw text, update metadata, player groups, and safe message fields. Do not expose recipient lists, canonical deduplication keys, source-line numbers, or raw selected-answer records.

Quiz uses only `all` reward pools. `QuizAwardCalculator` and `QuizEventSummaryCalculator` produce saved awards and summaries once from the event snapshot; read paths must never re-resolve pools or recalculate historical outcomes.

Public Quiz responses are explicit read models:

- `QuizConfigView` and `QuizView` expose `meta`, `content`, `configuration`, and `validation`;
- `QuizEventView` exposes `meta`, `configuration`, and runtime `state`.

`QuizConfigReadModelFactory`, `QuizReadModelFactory`, and `QuizEventReadModelFactory` own those projections. Do not spread Mongo documents or `Quiz*Document` values into HTTP responses, and do not reintroduce `_id`, `schemaVersion`, `quizQuestionId`, raw `selectedAnswers`, or raw parsed-chat fields into public DTOs. Preserve the legacy-safe projection for historical events that lack newer chat-workspace fields.

---

## Projects, presets, and resources

The active configuration model is `Project` plus project-owned `GameConfig` presets. `/api/configs` and the legacy config runtime module do not exist.

- Projects own the reusable resource catalog (currencies and items).
- GameConfig belongs to one project and one game type; its rules may reference only resources from that project.
- Validate resource IDs, amounts, pool semantics, and currency precision before saving a preset.
- New games must be created from a project-scoped preset and keep `projectId` + `configId`.
- A game stores the resource snapshot required to interpret its saved grants and payouts; do not rely on the mutable project catalog when reading a historical game.
- Project and GameConfig deletion is permanent in MVP. Do not implement archive/restore, duplicate flows, versions, or optimistic locking unless scope changes.
- The legacy `configs` repository/types/normalizer are offline backup-import adapters only; never mount them in DI, routes, or startup bootstrap.

Avoid spreading default rules or currency constants across backend and frontend.

---

## API design

Prefer domain-oriented API endpoints.

Good:

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
PUT    /api/projects/:projectId
DELETE /api/projects/:projectId

GET    /api/projects/:projectId/game-configs
POST   /api/projects/:projectId/game-configs
GET    /api/projects/:projectId/game-configs/:gameConfigId
PUT    /api/projects/:projectId/game-configs/:gameConfigId
DELETE /api/projects/:projectId/game-configs/:gameConfigId

POST   /api/projects/:projectId/battleships/games
GET    /api/projects/:projectId/battleships/games/:gameId
POST   /api/projects/:projectId/battleships/games/:gameId/shots
POST   /api/projects/:projectId/battleships/games/:gameId/shots/undo
DELETE /api/projects/:projectId/battleships/games/:gameId

POST   /api/projects/:projectId/journey/games
GET    /api/projects/:projectId/journey/games/:gameId
POST   /api/projects/:projectId/journey/games/:gameId/rounds
DELETE /api/projects/:projectId/journey/games/:gameId/players/:playerId
DELETE /api/projects/:projectId/journey/games/:gameId
POST   /api/journey/parse/players
POST   /api/journey/parse/moves

POST   /api/projects/:projectId/lotto/games
GET    /api/projects/:projectId/lotto/games/:gameId
POST   /api/projects/:projectId/lotto/games/:gameId/draw
DELETE /api/projects/:projectId/lotto/games/:gameId/players/:playerId
DELETE /api/projects/:projectId/lotto/games/:gameId
```

Avoid screen-oriented endpoints:

```text
GET /journey-page-data
GET /main-page-data
```

Avoid full snapshot overwrite endpoints for Journey game state.

Avoid full snapshot overwrite endpoints for Battleships game state.

Avoid full snapshot overwrite endpoints for Lotto game state as well.

Journey should be mutated only through business actions such as:

* create game
* submit round
* remove player
* delete game

Battleships should be mutated only through business actions such as:

* create game
* apply shot
* undo shot
* delete game

Lotto should be mutated only through business actions such as:

* create game
* draw next number
* remove player
* delete game

Read-model expansion is acceptable in responses. The backend may return:

* normalized game state
* derived read-only Journey fields
* derived read-only Battleships fields
* derived read-only Lotto fields
* config summaries for frontend display

For Lotto specifically, backend responses may expose host-facing derived data such as legacy result summary text, prize tables, and saved-game DJ metadata because these are read-model concerns, not frontend-owned rules.

---

## Repository rule

Database access should be isolated in repositories.

Good:

```ts
export class JourneyRepository {
  async findById(id: string) {}
  async create(game: JourneyGame) {}
  async update(game: JourneyGame) {}
  async delete(id: string) {}
}
```

Avoid this in services long-term:

```ts
collection.findOne(...)
collection.insertOne(...)
collection.updateOne(...)
```

A service should describe the use case, not database mechanics.

Mongo access should flow like this:

```text
MongoConnection / MongoDatabase -> Repository -> Service -> Controller
```

Do not reintroduce generic `getCollection(...)` helpers that are consumed directly by services.

---

## Error handling

Controllers should convert service errors into HTTP responses.

Services should throw meaningful domain/application errors.

Prefer typed error classes over message matching.

Avoid returning unclear `null`, `undefined`, or partial objects from service methods when the operation failed.

Prefer explicit errors:

```ts
throw new GameNotFoundError(gameId);
throw new InvalidRoundInputError(reason);
throw new GameConfigNotFoundError(gameConfigId);
```

Do not branch on `error.message` in controllers or services unless preserving a temporary migration shim that is about to be removed.

HTTP status mapping should be based on explicit error classes.

---

## Validation

Validate incoming request bodies before using them.

Prefer schema-based validation when adding new endpoints.

Use schema-based validation by default for params, query, and body.

Current preferred tool is `zod`.

Validation belongs near the API boundary, not deep inside UI components.

---

## Migration rules

When migrating functionality from `LEGACY/`:

1. Understand the original behavior first.
2. Move game rules to backend domain/engine.
3. Keep frontend as a consumer of API state.
4. Do not preserve localStorage as the source of truth.
5. Do not copy legacy procedural style blindly.
6. Add types for migrated entities.
7. Prefer small, verifiable migration steps.

For production data conversion, use the explicit offline EJSON scripts:

- `backup:import-new-schema` creates a separate new-schema backup and must never modify its source.
- `backup:restore-new-schema:* -- --dry-run` validates a target before writing.
- Restoration requires `--confirm-replace`; it replaces only the new-model collections and removes legacy `configs`.
- Do not run the legacy split migration after restoring a new-schema backup.

---

## LocalStorage policy

Backend must not rely on frontend localStorage.

The frontend may store only lightweight client preferences or identifiers, for example:

- current game id
- theme
- UI preferences

Game state must live on the backend.

---

## What to avoid

Avoid:

- duplicating engine logic between backend and frontend
- putting business logic in controllers
- putting MongoDB code directly in controllers
- putting MongoDB code directly in services
- massive services with mixed responsibilities
- untyped request bodies
- magic strings for game names, project IDs, config IDs, or statuses
- route files that instantiate dependencies
- request handlers with hidden bootstrap/init side effects
- multiple unrelated env-loading entry points
- string-based error matching as a steady-state design
- adding new games by copy-pasting Journey code without extracting common abstractions

---

## Preferred next refactorings

When improving the backend, prioritize:

1. Keep module boundaries explicit: controller, service, repository, engine/parser/read-model.
2. Preserve composition root discipline when adding modules.
3. Remove duplicated frontend engine logic.
4. Introduce shared DTO/types strategy if needed.
5. Keep adding games as separate backend modules with config/resource snapshots and backend-owned rule sources.
6. Extract common game abstractions only after at least two or three games exist.
7. Preserve module-specific product rules already encoded in Battleships and Lotto instead of flattening them into a premature generic game framework.

Do not over-engineer a generic game framework too early.
