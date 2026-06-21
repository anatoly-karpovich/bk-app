# AGENTS.md

## Purpose

This `backend` app is a TypeScript Express API for forum-game tooling.

Today it exposes:

- forum topic proxying
- global read-only project configs
- Journey game persistence
- Journey game state transitions backed by MongoDB

When editing this app, optimize for:

- preserving domain behavior from the Journey engine
- keeping transport logic thin
- maintaining a clear `service -> controller -> route` structure
- keeping persistence concerns outside the pure game engine

---

## Technology Stack

- Node.js
- TypeScript
- Express 4
- MongoDB native driver
- `tsx` for local dev
- `nodemon` for watch mode

Entry points:

- [src/server.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/server.ts:1)
- [src/app.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/app.ts:1)

Build commands:

- `npm run dev`
- `npm run build`
- `npm run start`

Minimum verification after meaningful backend changes:

- `npm run build`

---

## Project Map

### App Shell

- [src/server.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/server.ts:1)
  Boots Mongo connection first, then starts Express.

- [src/app.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/app.ts:1)
  Registers middleware and mounts API routers.

### Shared Infrastructure

- [src/lib/mongo.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/lib/mongo.ts:1)
  Central MongoDB connection and collection access.

Important behavior:

- `MONGODB_URI` is required and must come from `backend/.env` or process env
- `MONGODB_DB_NAME` can override the default DB name
- connection lifecycle should stay centralized here
- `process.loadEnvFile()` is used instead of `dotenv`

### Configs Module

- [src/modules/configs/domain/types.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/configs/domain/types.ts:1)
  Canonical app-level config types.

- [src/modules/configs/domain/defaultConfigs.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/configs/domain/defaultConfigs.ts:1)
  Built-in project configs such as `oldbk2` and `combatsclub`.

- [src/modules/configs/services/configs.service.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/configs/services/configs.service.ts:1)
  Loads configs from Mongo and ensures the built-in defaults exist.

- [src/modules/configs/controllers/configs.controller.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/configs/controllers/configs.controller.ts:1)
- [src/modules/configs/routes/configs.routes.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/configs/routes/configs.routes.ts:1)
  Read-only HTTP boundary for `/api/configs`.

### Forum Topic API

- [src/controllers/forumTopic.controller.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/controllers/forumTopic.controller.ts:1)
- [src/routes/forumTopic.routes.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/routes/forumTopic.routes.ts:1)

### Journey Module

The Journey backend is intentionally split into layers:

- `domain`
- `services`
- `controllers`
- `routes`

#### Domain

- [src/modules/journey/domain/types.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/domain/types.ts:1)
  Canonical Journey domain types and public DTOs.

- [src/modules/journey/domain/config.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/domain/config.ts:1)
  Pure Journey rule normalization, move type constants, and config derivation helpers.

- [src/modules/journey/domain/engine.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/domain/engine.ts:1)
  Core Journey game logic and state transitions.

- [src/modules/journey/domain/parsers.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/domain/parsers.ts:1)
  Forum-text parsing for players and dice values.

- [src/modules/journey/domain/commentTemplates.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/domain/commentTemplates.ts:1)
  Comment/log generation tied to Journey game outcomes.

#### Service Layer

- [src/modules/journey/services/journey.service.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/services/journey.service.ts:1)

Responsibilities:

- load and save Journey snapshots
- resolve `configId` into `config.games.journey` on game creation
- apply engine transitions to stored games
- serialize Mongo documents to API responses
- keep persistence logic out of controllers

#### Controller Layer

- [src/modules/journey/controllers/journey.controller.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/controllers/journey.controller.ts:1)

Responsibilities:

- HTTP parameter parsing
- input validation
- service orchestration
- response status selection

Controllers should not:

- contain game-rule logic
- build Mongo queries directly
- duplicate behavior from `engine.ts`
- embed built-in config payloads inline

#### Route Layer

- [src/modules/journey/routes/journey.routes.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/routes/journey.routes.ts:1)

Responsibilities:

- define public URL structure
- map endpoints to controllers
- stay declarative and thin

---

## Current API Surface

### Forum

- `GET /api/forum/topic?topicId=<id>`

### Configs

- `GET /api/configs`
- `GET /api/configs/:configId`

### Journey

- `GET /api/journey/games/latest`
- `GET /api/journey/games/:gameId`
- `POST /api/journey/games`
- `PUT /api/journey/games/:gameId`
- `POST /api/journey/games/:gameId/rounds`
- `DELETE /api/journey/games/:gameId/players/:playerId`
- `DELETE /api/journey/games/:gameId`
- `POST /api/journey/parse/players`
- `POST /api/journey/parse/moves`

Important note:

- the frontend loads available project configs from `/api/configs`
- Journey game creation now resolves rules from `configId` on the backend
- the backend returns a lean Journey DTO for UI needs rather than the full internal snapshot shape
- Mongo still stores a fuller internal snapshot than the public API returns

---

## Layering Rules

### 1. Domain First

For Journey, the source of truth for rules is the domain layer, especially:

- `types.ts`
- `config.ts`
- `engine.ts`

If a Journey rule changes:

1. update the domain layer first
2. if built-in project configs should change too, update `modules/configs/domain/defaultConfigs.ts`
3. then update service/controller behavior if needed
4. avoid patching rule behavior in controllers

### 2. Keep Services Stateful, Domain Pure

`engine.ts` should stay pure with respect to HTTP and database concerns.

Good:

- `createJourneyGame(...)`
- `makeJourneyRound(...)`
- `removeJourneyPlayer(...)`

Bad:

- reading `req.body` in domain code
- touching Mongo from domain functions
- putting `res.status(...)` logic in services

### 3. Controllers Are Transport Boundaries

Controllers should:

- validate request shape
- convert route/query/body data to service inputs
- return appropriate HTTP codes

Controllers should not:

- construct gameplay comments
- mutate Journey snapshots manually
- know storage collection names

### 4. Routes Stay Thin

Routes should only wire endpoint paths to controller functions.

Avoid:

- inline validation in route files
- route-local business logic
- route files that understand persistence details

---

## Persistence Model

Journey is stored as snapshot-style documents in MongoDB.

This means:

- one document represents one full `JourneyGame`
- service code loads the snapshot
- domain engine applies the transition
- service code saves the full updated snapshot back

Important distinction:

- stored Mongo documents use the fuller internal `JourneyGame` shape
- older documents may still contain legacy `rulesetId/rulesetName` fields and must be normalized on read
- HTTP responses are serialized into a lean public DTO in `journey.service.ts`
- do not assume the API response shape and storage shape are identical

If you change the snapshot shape:

1. update domain types first
2. preserve compatibility where practical
3. normalize before saving or after reading
4. avoid partial ad-hoc field drift between frontend and backend

---

## Journey Domain Guidance

Key concepts:

- app configs
- per-game rules snapshots
- game snapshot
- players
- rounds
- round entries
- map cells
- achievements
- player ids as the primary mutation key

Important exports in [engine.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/domain/engine.ts:1):

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

- treat `engine.ts` as the Journey rulebook
- treat `modules/configs` as the source of truth for which project configs exist
- do not re-implement move outcomes in controllers or services
- if a new endpoint needs Journey calculations, prefer calling domain helpers
- mutations should key players by `playerId`, not `nickname`
- `nickname` is still valid as display/log snapshot data

---

## TypeScript Rules

This backend is strict TypeScript.

When editing:

- prefer explicit types at module boundaries
- keep `unknown` at external boundaries only
- narrow request input before use
- avoid spreading `as` casts through controllers

Avoid:

- weakening `strict`
- using `any`
- hiding schema uncertainty with broad assertions

---

## Mongo Rules

The project uses the native MongoDB driver, not Mongoose.

When touching Mongo code:

- keep collection access inside infra/service boundaries
- avoid opening ad-hoc clients in feature code
- centralize connection setup in `lib/mongo.ts`

If persistence grows more complex, prefer:

1. repository-style extraction first
2. runtime validation second
3. only then reconsider ODM adoption

---

## Input Validation Rules

Backend input is untrusted by default.

For any new endpoint:

1. validate route params
2. validate query params
3. validate body payload
4. return a clear `400` for malformed input

Do not:

- pass raw `req.body` into domain functions without checks
- trust client-sent snapshots blindly
- trust client-sent Journey rules when `configId` should be resolved server-side
- accept malformed game ids or player identifiers
- reintroduce nickname-based mutation payloads where `playerId` is already available

---

## Editing Rules for Common Tasks

### If You Change a Journey Rule

1. update `domain/config.ts` and/or `domain/engine.ts`
2. update built-in app configs if the default projects should inherit the new rule
3. ensure services still persist the resulting shape correctly
4. ensure controller payload expectations still make sense
5. run `npm run build`

### If You Change Global Config Behavior

1. update `modules/configs/domain/types.ts` first
2. update `modules/configs/services` and HTTP responses
3. verify Journey creation still resolves `config.games.journey` correctly
4. run `npm run build`

### If You Add a Journey Endpoint

1. add or update domain/service behavior first if needed
2. add controller function
3. mount route
4. keep route naming consistent with existing `/api/journey/...`
5. run `npm run build`

### If You Add Shared Infra

1. place it under `src/lib`
2. keep it framework-agnostic where practical
3. avoid leaking feature-specific behavior into shared infrastructure

---

## Known Transitional Areas

These areas are intentionally transitional:

- frontend still contains Journey engine helpers for derivation/normalization, but game mutations are backend-driven
- frontend keeps the selected config locally, while the backend owns the available config list
- backend stores snapshot documents rather than a more normalized game model
- validation is manual rather than schema-driven
- public API DTOs are leaner than internal Mongo snapshots

When editing these areas:

- preserve current behavior
- avoid introducing backend-only rule changes
- prefer shapes and names that can later support frontend API adoption

---

## Verification Checklist

After meaningful edits, check:

1. `npm run build`
2. new endpoints still follow `service -> controller -> route`
3. no Journey rule logic leaked into controllers
4. no Mongo connection logic duplicated outside `lib/mongo.ts`
5. request validation still rejects malformed external input

---

## Do / Don't

Do:

- keep Journey rules in the domain layer
- keep available project configs in `modules/configs`
- keep controllers thin
- keep routes declarative
- centralize Mongo access
- preserve snapshot compatibility where practical
- use strict TypeScript at boundaries

Don't:

- duplicate engine logic in HTTP handlers
- put Mongo calls directly in route files
- introduce `any` to bypass strict typing
- silently change stored snapshot semantics
- add Mongoose casually without an explicit architecture decision
