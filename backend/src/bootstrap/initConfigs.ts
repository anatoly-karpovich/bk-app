import { getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { ConfigsRepository } from "../modules/configs/ConfigsRepository";
import { DEFAULT_APP_CONFIGS } from "../modules/configs/domain/defaultConfigs";

export async function initConfigs(): Promise<void> {
  const configsRepository = new ConfigsRepository(getDefaultMongoDatabase());
  await configsRepository.upsertDefaults(DEFAULT_APP_CONFIGS);
}
