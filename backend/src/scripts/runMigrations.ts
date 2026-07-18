import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection, getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { MigrationRunner } from "../migrations/MigrationRunner";
import { MigrationsRepository } from "../migrations/MigrationsRepository";
import { registeredMigrations } from "../migrations/registeredMigrations";

async function run() {
  loadEnvironment();

  const mongoConnection = getDefaultMongoConnection();
  const mongoDatabase = getDefaultMongoDatabase();
  await mongoConnection.connect();

  const runner = new MigrationRunner(new MigrationsRepository(mongoDatabase), registeredMigrations);
  const report = await runner.runPending({
    mongoConnection,
    mongoDatabase,
  });

  console.log(JSON.stringify(report, null, 2));

  const client = await mongoConnection.getClient();
  await client.close();
}

run().catch((error) => {
  console.error("Migration run failed", error);
  process.exit(1);
});
