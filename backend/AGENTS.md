# AGENTS.md - Backend

## Project context

This backend powers BK radio/forum games. The project is being migrated from the old vanilla JavaScript implementation in `LEGACY/` to a React + backend architecture.

The backend must become the source of truth for:

- game state
- game rules
- game configs
- project currency
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
    configs/
      ConfigsController.ts
      ConfigsRepository.ts
      ConfigsService.ts
      configs.routes.ts
      configs.schemas.ts
      domain/
      errors/
    journey/
      JourneyController.ts
      JourneyEngine.ts
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
    private readonly engine: JourneyEngine,
  ) {}

  async submitRound(gameId: string, input: SubmitRoundDto) {
    const game = await this.repository.findById(gameId);
    const updatedGame = this.engine.makeRound(game, input);
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
  JourneyEngine.ts
```

The old `domain/engine.ts` and `domain/parsers.ts` files may remain as low-level implementation detail, but `JourneyService` and `JourneyController` should depend on `JourneyEngine`, `JourneyParser`, `JourneyRepository`, and read-model classes rather than on procedural service wrappers.

The Journey engine should be the only place that knows how to:

- create a Journey game
- create the map
- create players
- remove players
- build moves
- resolve rounds
- refresh indexes
- calculate final state

The same principle applies to Battleships and Lotto: their engines own the game-result logic, while controllers and services stay at orchestration level.

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
- calculate prize deltas
- determine attempts left and finished state

The Battleships read-model factory is the correct place for host-facing derived fields such as visible board cells, coordinate labels, fleet summary, and current prize snapshots.

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
- build the legacy grouped summary of remaining numbers

The Lotto read-model factory is the correct place for host-facing derived fields such as prize tables, visible winner groups, event ordering for UI, and saved-game metadata.

---

## Configs

Game configs currently live in the configs module and are initialized through default configs.

This is acceptable during migration, but the long-term direction is:

- configs are persisted on the backend
- backend validates configs
- frontend edits configs through API
- frontend does not hardcode default game rules
- shared project data such as currency is modeled once in backend config contracts and reused by game modules

Avoid spreading config constants across backend and frontend.

Default config upsert/seed behavior belongs to bootstrap/init only.

Read use cases such as `GET /api/configs` must not perform hidden initialization side effects.

---

## API design

Prefer domain-oriented API endpoints.

Good:

```text
GET    /api/configs
GET    /api/configs/:configId

POST   /api/battleships/games
GET    /api/battleships/games/:gameId
GET    /api/battleships/games/latest
POST   /api/battleships/games/:gameId/shots
POST   /api/battleships/games/:gameId/shots/undo
DELETE /api/battleships/games/:gameId

POST   /api/journey/games
GET    /api/journey/games/:gameId
GET    /api/journey/games/latest
POST   /api/journey/games/:gameId/rounds
DELETE /api/journey/games/:gameId/players/:playerId
DELETE /api/journey/games/:gameId
POST   /api/journey/parse/players
POST   /api/journey/parse/moves

POST   /api/lotto/games
GET    /api/lotto/games/:gameId
GET    /api/lotto/games/latest
POST   /api/lotto/games/:gameId/draw
DELETE /api/lotto/games/:gameId/players/:playerId
DELETE /api/lotto/games/:gameId
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
throw new ConfigNotFoundError(configKey);
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
- magic strings for game names, config keys, or statuses
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
5. Keep adding games as separate backend modules with config snapshots and backend-owned currency/rule sources.
6. Extract common game abstractions only after at least two or three games exist.
7. Preserve module-specific product rules already encoded in Battleships and Lotto instead of flattening them into a premature generic game framework.

Do not over-engineer a generic game framework too early.
