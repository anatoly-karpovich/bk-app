import { getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { ConfigsRepository } from "../modules/configs/ConfigsRepository";
import { DEFAULT_APP_CONFIGS } from "../modules/configs/domain/defaultConfigs";
import { buildPersistedAppConfig } from "../modules/configs/domain/normalizeConfig";

export async function initConfigs(): Promise<void> {
  const configsRepository = new ConfigsRepository(getDefaultMongoDatabase());

  if (await configsRepository.hasAnyConfigs()) {
    return;
  }

  await configsRepository.insertInitial(
    DEFAULT_APP_CONFIGS.map((config) => buildPersistedAppConfig(config)),
  );
}
