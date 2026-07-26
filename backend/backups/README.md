# New-schema backup conversion

## Exporting clean-start data from local MongoDB

This export includes only reusable `projects` and `game_configs`. It always writes
empty `journey_games`, `battleships_games`, and `lotto_games` collections, so a
restore starts without saved games. The target directory must not already exist.

```powershell
cd backend
npm run backup:export-start-data:local -- --output backups/local-start-data-YYYY-MM-DD
```

The resulting directory is compatible with the new-schema restore command below.

`db-data-projects` is the checked-in `project-game-config-backup-v2` local start-data set. When
`BK_APP_SEED_EMPTY_DB=true` in `.env.local`, backend loads it automatically only if
all application collections are empty. A partially initialized database stops
startup and prints the exact manual restore command instead of being overwritten.

`db-data-projects-v1` is retained as the immutable source archive from before the
v2 upgrade. It is not used by the application. To upgrade another v1 directory
without modifying its source, run:

```powershell
cd backend
npm run backup:upgrade-project-game-config -- --source backups\db-data-projects-v1 --output backups\db-data-projects-v2
```

The upgrader normalizes every project currency and game rule set, derives decimal
precision from configured reward values, validates currency references, and writes
a new `project-game-config-backup-v2` directory.

## Archiving a database before a replacement

Create a complete EJSON archive immediately before replacing a database. The archive
contains every current collection, its documents, and its indexes; it is an immutable
recovery record and must be stored outside the repository as well.

```powershell
cd backend
npm run backup:export-raw:prod -- --output backups/prod-before-start-data-YYYY-MM-DD
```

The converter reads a legacy EJSON backup and writes a different directory. It never connects to MongoDB and does not modify the source backup.

```powershell
cd backend
npm run backup:import-new-schema -- --source backups/prod-backup-2026-07-18T01-44-26-799Z --output backups/prod-backup-2026-07-18T01-44-26-799Z-new-schema
```

The result contains `projects.data.ejson`, `game_configs.data.ejson`, converted game collections, `manifest.json`, and `import-report.json`.

`import-report.json` lists game IDs excluded because their legacy config cannot be resolved or their snapshot is invalid for the current engine. This is intentional for the agreed MVP data-curation policy.

## Restoring the new-schema backup

The restore script connects through the selected environment file and replaces only `projects`, `game_configs`, `journey_games`, `battleships_games`, `lotto_games`, and the obsolete `configs` collection. It does not drop the whole database and does not touch `migrations` or unrelated collections.

First validate both the backup and the selected MongoDB target. This does not write to MongoDB:

```powershell
cd backend
npm run backup:restore-new-schema:prod -- --source backups/prod-backup-2026-07-18T01-44-26-799Z-new-schema --dry-run
```

After reviewing the printed database name, current counts, source counts, and `import-report.json`, stop the application and run the replacement explicitly:

```powershell
npm run backup:restore-new-schema:prod -- --source backups/prod-backup-2026-07-18T01-44-26-799Z-new-schema --confirm-replace
```

The script loads all files and verifies their manifest counts before changing live collections. It stages the new data, swaps collections one at a time, and keeps old collections temporarily for rollback if a swap fails. On full success it permanently removes the temporary rollback collections and the old `configs` collection.

Do not run `migrate:prod` after this restore: the restored data already uses the new schema, while that migration expects legacy `configs` documents.
