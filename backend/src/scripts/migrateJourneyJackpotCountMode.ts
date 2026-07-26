import type { Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

const APPLY_ARGUMENT = "--apply";

async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const collection = client.db(connection.getDatabaseName()).collection<Document>("game_configs");
  const filter = {
    gameType: "journey",
    "rules.jackpot.countMode": { $exists: false },
  };

  try {
    const matchingConfigs = await collection.countDocuments(filter);

    if (!process.argv.includes(APPLY_ARGUMENT)) {
      console.log(
        JSON.stringify(
          {
            database: connection.getDatabaseName(),
            matchingConfigs,
            applied: false,
            nextStep: `Run again with ${APPLY_ARGUMENT} to set rules.jackpot.countMode to fixed.`,
          },
          null,
          2,
        ),
      );
      return;
    }

    const result = await collection.updateMany(filter, {
      $set: { "rules.jackpot.countMode": "fixed" },
    });
    console.log(
      JSON.stringify(
        {
          database: connection.getDatabaseName(),
          matchingConfigs,
          modifiedConfigs: result.modifiedCount,
          applied: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Journey jackpot count-mode migration failed", error);
  process.exit(1);
});
