import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";
import { initConfigs } from "./initConfigs";
import { loadEnvironment } from "./loadEnvironment";

export interface InitializedApplication {
  mongoConnection: ReturnType<typeof getDefaultMongoConnection>;
}

export async function initApplication(): Promise<InitializedApplication> {
  loadEnvironment();
  const mongoConnection = getDefaultMongoConnection();

  await mongoConnection.connect();
  await initConfigs();

  return {
    mongoConnection,
  };
}
