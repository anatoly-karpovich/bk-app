import { getMongoCollection } from "../../../lib/mongo";
import { DEFAULT_APP_CONFIGS } from "../domain/defaultConfigs";
import type { AppConfig } from "../domain/types";

const CONFIGS_COLLECTION = "configs";

function getConfigsCollection() {
  return getMongoCollection<AppConfig>(CONFIGS_COLLECTION);
}

async function ensureDefaultConfigs(): Promise<void> {
  const collection = await getConfigsCollection();

  await Promise.all(
    DEFAULT_APP_CONFIGS.map((config) =>
      collection.updateOne(
        { id: config.id },
        {
          $setOnInsert: config,
        },
        { upsert: true },
      ),
    ),
  );
}

export async function listConfigs(): Promise<AppConfig[]> {
  await ensureDefaultConfigs();
  const collection = await getConfigsCollection();
  const configs = await collection.find({}).toArray();
  const preferredOrder = new Map(DEFAULT_APP_CONFIGS.map((config, index) => [config.id, index]));

  return configs.sort((left, right) => {
    const leftIndex = preferredOrder.get(left.id);
    const rightIndex = preferredOrder.get(right.id);

    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex;
    }

    if (leftIndex !== undefined) {
      return -1;
    }

    if (rightIndex !== undefined) {
      return 1;
    }

    return left.name.localeCompare(right.name, "ru");
  });
}

export async function getConfigById(configId: string): Promise<AppConfig | null> {
  await ensureDefaultConfigs();
  const collection = await getConfigsCollection();
  return collection.findOne({ id: configId });
}
