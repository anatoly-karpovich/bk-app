import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";
import { loadEnvironment } from "./loadEnvironment";
import { seedLocalStartDataIfNeeded } from "./seedLocalStartData";

export interface InitializedApplication {
  mongoConnection: ReturnType<typeof getDefaultMongoConnection>;
}

export async function initApplication(): Promise<InitializedApplication> {
  loadEnvironment();
  const mongoConnection = getDefaultMongoConnection();

  await mongoConnection.connect();
  const client = await mongoConnection.getClient();
  await seedLocalStartDataIfNeeded(client.db(mongoConnection.getDatabaseName()));

  return {
    mongoConnection,
  };
}
