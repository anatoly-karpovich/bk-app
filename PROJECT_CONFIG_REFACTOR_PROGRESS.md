# Project / Game Config Refactor Progress

Updated: 2026-07-18

## Approved MVP decisions

- Projects and presets are permanently deleted; archive/restore is out of MVP.
- Config versioning and optimistic locking are out of MVP.
- Additional MongoDB indexes are out of MVP because the expected data volume is small.
- Legacy production data is curated from an offline backup; malformed records may be excluded.
- Automated tests are deferred.

## Current status

The project/preset runtime is switched to the new model.

- `Project` and project-owned `GameConfig` CRUD APIs exist.
- Project currencies have complete metadata and preset saving validates currency IDs, values, and precision.
- All Journey, Battleships, and Lotto game routes, services, repositories, and frontend clients are project-scoped.
- Deleting a preset does not delete saved games; deleting a project permanently deletes its presets and games.
- `/api/configs`, the legacy config service/controller/routes, old create-game endpoints, frontend `features/configs`, bootstrap and seed scripts are removed from runtime.
- The legacy config repository, types and normalizer remain only as an offline backup-import adapter. They are not mounted or wired into runtime DI.
- Backend and frontend TypeScript builds have passed after the cleanup.

## Deterministic backup conversion

`backend/src/scripts/importBackupToNewSchema.ts` turns an old EJSON backup into a separate, reviewable new-schema backup.

- It uses only filesystem reads from `--source` and filesystem writes to `--output`; the two paths must differ.
- Each legacy config becomes one `Project` and three `GameConfig` documents (`journey`, `battleships`, `lotto`).
- Project IDs retain legacy config IDs. GameConfig IDs derive from a stable SHA-256 seed, so repeated conversion of the same source yields the same IDs and payload.
- A game maps through its old `configId`; a unique legacy `configName` is used only as a fallback. Its saved snapshot is then normalized by the current game engine.
- Invalid or unresolvable game records are intentionally excluded and listed in `import-report.json`, per the agreed data-curation policy.

Command:

```powershell
cd backend
npm run backup:import-new-schema -- --source backups/prod-backup-2026-07-18T01-44-26-799Z --output backups/prod-backup-2026-07-18T01-44-26-799Z-new-schema
```

Generated comparison target:

- source (untouched): `backend/backups/prod-backup-2026-07-18T01-44-26-799Z`
- result: `backend/backups/prod-backup-2026-07-18T01-44-26-799Z-new-schema`

The result contains `projects.data.ejson`, `game_configs.data.ejson`, converted game collections, `manifest.json`, and `import-report.json`.

The restore command is `npm run backup:restore-new-schema:prod -- --source <new-backup-dir> --dry-run`, followed by the same command with `--confirm-replace` after review. It stages and verifies the data before replacing the new-schema collections and permanently removing `configs`.

## Remaining work

- Review the converted backup and `import-report.json`, then explicitly restore/import the reviewed output to the intended database.
- Add a frontend administration UI for project and preset CRUD if operators need it.
- Authentication, project membership and roles are separate future work.
- The multi-currency engine rewrite remains a separate phase after this migration.
