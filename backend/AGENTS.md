# AGENTS.md

## Purpose

This `backend` app is a TypeScript Express API for forum-game tooling.

Today it exposes:

- forum topic proxying
- Journey (`Карта Мародёров`) game persistence
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

- `MONGODB_URI` can override the default URI
- `MONGODB_DB_NAME` can override the default DB name
- connection lifecycle should stay centralized here

### Forum Topic API

- [src/controllers/forumTopic.controller.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/controllers/forumTopic.controller.ts:1)
- [src/routes/forumTopic.routes.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/routes/forumTopic.routes.ts:1)

This module is a thin proxy around the external forum topic API.

### Journey Module

The Journey backend is intentionally split into layers:

- `domain`
- `services`
- `controllers`
- `routes`

#### Domain

- [src/modules/journey/domain/types.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/domain/types.ts:1)
  Canonical Journey domain types.

- [src/modules/journey/domain/config.ts](/abs/path/C:/Users/anato/git/bk-app/backend/src/modules/journey/domain/config.ts:1)
  Rulesets, normalization, move type constants, config derivation.

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

### Journey

- `GET /api/journey/games/latest`
- `GET /api/journey/games/:gameId`
- `POST /api/journey/games`
- `PUT /api/journey/games/:gameId`
- `POST /api/journey/games/:gameId/rounds`
- `DELETE /api/journey/games/:gameId/players/:nickname`
- `DELETE /api/journey/games/:gameId`
- `POST /api/journey/parse/players`
- `POST /api/journey/parse/moves`

Important note:

- the frontend still has its own local Journey logic and storage flow
- this backend currently mirrors that behavior; it does not replace frontend state by itself

---

## Layering Rules

### 1. Domain First

For Journey, the source of truth for rules is the domain layer, especially:

- `types.ts`
- `config.ts`
- `engine.ts`

If a Journey rule changes:

1. update the domain layer first
2. then update service/controller behavior if needed
3. avoid patching rule behavior in controllers

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

Journey is currently stored as snapshot-style documents in MongoDB.

This means:

- one document represents one full `JourneyGame`
- service code loads the snapshot
- domain engine applies the transition
- service code saves the full updated snapshot back

This is intentional right now because:

- it mirrors the existing frontend game shape closely
- it minimizes translation layers
- it keeps the backend logic aligned with the current game engine

If you change the snapshot shape:

1. update domain types first
2. preserve compatibility where practical
3. normalize before saving or after reading
4. avoid partial ad-hoc field drift between frontend and backend

---

## Journey Domain Guidance

Key domain concepts:

- rulesets
- game snapshot
- players
- rounds
- round entries
- map cells
- achievements

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
- do not re-implement move outcomes in controllers or services
- if a new endpoint needs Journey calculations, prefer calling domain helpers

---

## TypeScript Rules

This backend is already strict TypeScript.

Current compiler direction in [tsconfig.json](/abs/path/C:/Users/anato/git/bk-app/backend/tsconfig.json:1):

- `strict: true`
- `rootDir: src`
- `outDir: dist`

When editing:

- prefer explicit types at module boundaries
- keep `unknown` at external boundaries only
- narrow request input before use
- avoid spreading `as` casts through controllers

Good candidates for stronger typing:

- request DTOs
- response envelopes
- route param/query/body generics for `Request`
- repository return types

Avoid:

- weakening `strict`
- using `any`
- hiding schema uncertainty with broad assertions

---

## Mongo Rules

The project currently uses the native MongoDB driver, not Mongoose.

That is the preferred default unless there is an explicit migration decision.

Why:

- less duplication with existing TypeScript domain types
- fewer abstraction layers
- easier snapshot persistence

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
- accept malformed game ids or player identifiers

Current validation style is lightweight and manual.

If validation becomes repetitive, prefer introducing a schema layer consistently rather than one-off helpers in random files.

---

## Editing Rules for Common Tasks

### If You Change a Journey Rule

1. update `domain/config.ts` and/or `domain/engine.ts`
2. ensure services still persist the resulting shape correctly
3. ensure controller payload expectations still make sense
4. run `npm run build`

### If You Add a Journey Endpoint

1. add or update domain/service behavior first if needed
2. add controller function
3. mount route
4. keep route naming consistent with existing `/api/journey/...`
5. run `npm run build`

### If You Change Persistence Shape

1. update domain types
2. update service serialization/deserialization
3. keep normalization behavior explicit
4. avoid silent divergence between stored snapshots and domain expectations

### If You Add Shared Infra

1. place it under `src/lib`
2. keep it framework-agnostic where practical
3. avoid leaking feature-specific behavior into shared infrastructure

---

## Design Rules for the Backend

### Prefer Coherent Modules

Feature code should live together.

For Journey, prefer staying inside:

- `src/modules/journey/domain`
- `src/modules/journey/services`
- `src/modules/journey/controllers`
- `src/modules/journey/routes`

Do not scatter Journey logic into top-level folders unless it truly becomes shared.

### Prefer Explicit URLs

Routes should stay human-readable and resource-oriented.

Current style:

- `/games/:gameId`
- `/games/:gameId/rounds`
- `/games/:gameId/players/:nickname`
- `/parse/players`

Keep that style consistent unless the whole API design changes.

### Preserve Thin HTTP Edges

The app is still small.

Avoid overengineering with:

- generic base controllers
- abstract router factories
- premature DI containers

Small explicit modules are preferred here.

---

## Known Transitional Areas

These areas are intentionally transitional:

- Journey logic is duplicated between frontend and backend
- frontend still uses local state/storage flow
- backend stores snapshot documents rather than a more normalized game model
- validation is manual rather than schema-driven

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
