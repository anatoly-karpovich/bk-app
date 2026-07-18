import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";
import { initConfigs } from "../bootstrap/initConfigs";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { migrateConfigs } from "../bootstrap/migrateConfigs";

async function run() {
  loadEnvironment();
  const mongoConnection = getDefaultMongoConnection();

  await mongoConnection.connect();
  await initConfigs();
  await migrateConfigs();

  const client = await mongoConnection.getClient();
  await client.close();
}

run()
  .then(() => {
    console.log("Config migration completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Config migration failed", error);
    process.exit(1);
  });
