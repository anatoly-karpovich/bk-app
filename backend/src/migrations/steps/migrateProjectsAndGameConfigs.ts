import { normalizeStoredAppConfig } from "../../modules/configs/domain/normalizeConfig";
import { ConfigsRepository } from "../../modules/configs/ConfigsRepository";
import { GameConfigsRepository } from "../../modules/gameConfigs/GameConfigsRepository";
import type { AnyGameConfig, GameType } from "../../modules/gameConfigs/domain/types";
import { ProjectsRepository } from "../../modules/projects/ProjectsRepository";
import { normalizeProjectCurrencies } from "../../modules/projects/domain/normalizeProjectCurrencies";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";

function deriveProjectCode(projectName: string): string {
  const trimmedName = projectName.trim();

  if (!trimmedName) {
    return "project";
  }

  const parts = trimmedName
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 1) {
    return trimmedName.charAt(0).toLowerCase() + trimmedName.slice(1);
  }

  return parts
    .map((part, index) => {
      const lower = part.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function createDefaultGameConfig(params: {
  projectId: string;
  gameType: GameType;
  rules: AnyGameConfig["rules"];
  description: string;
  createdAt: string;
  updatedAt: string;
}): AnyGameConfig {
  const { projectId, gameType, rules, description, createdAt, updatedAt } = params;

  return {
    projectId,
    gameType,
    name: "Default",
    description,
    rules,
    createdAt,
    updatedAt,
    legacyConfigId: null,
  } as AnyGameConfig;
}

async function migrateGameCollection(
  mongoDatabase: MongoDatabase,
  params: {
    collectionName: string;
    legacyConfigId: string;
    legacyConfigName: string;
    legacyProjectCode: string;
    projectId: string;
    gameConfigId: string;
  },
): Promise<number> {
  const collection = await mongoDatabase.getCollection(params.collectionName);
  const configIdAliases = Array.from(
    new Set([params.legacyConfigId, params.legacyProjectCode, params.legacyProjectCode.toLowerCase()]),
  );
  const configNameAliases = Array.from(
    new Set([params.legacyConfigName, params.legacyProjectCode, params.legacyProjectCode.toLowerCase()]),
  );
  const result = await collection.updateMany(
    {
      $or: [
        { configId: params.legacyConfigId },
        {
          projectId: { $exists: false },
          configId: { $in: configIdAliases },
        },
        {
          projectId: { $exists: false },
          configName: { $in: configNameAliases },
        },
      ],
    },
    {
      $set: {
        projectId: params.projectId,
        configId: params.gameConfigId,
        configName: "Default",
      },
    },
  );

  return result.modifiedCount;
}

export async function migrateProjectsAndGameConfigs(mongoDatabase: MongoDatabase) {
  const configsRepository = new ConfigsRepository(mongoDatabase);
  const projectsRepository = new ProjectsRepository(mongoDatabase);
  const gameConfigsRepository = new GameConfigsRepository(mongoDatabase);

  await projectsRepository.ensureIndexes();
  await gameConfigsRepository.ensureIndexes();

  const legacyConfigs = await configsRepository.findAll();
  const migrationSummary = {
    projectsUpserted: 0,
    gameConfigsUpserted: 0,
    journeyGamesUpdated: 0,
    battleshipsGamesUpdated: 0,
    lottoGamesUpdated: 0,
  };

  for (const legacyConfig of legacyConfigs) {
    const legacyConfigId = legacyConfig._id.toHexString();
    const fallbackTimestamp = legacyConfig._id.getTimestamp().toISOString();
    const normalizedConfig = normalizeStoredAppConfig(legacyConfig, fallbackTimestamp);
    const projectCode = deriveProjectCode(normalizedConfig.name);
    const persistedProject = await projectsRepository.upsertByLegacyConfigId(legacyConfigId, {
      code: projectCode,
      name: normalizedConfig.name,
      description: normalizedConfig.description,
      currencies: normalizeProjectCurrencies(normalizedConfig.currencies, normalizedConfig.createdAt),
      createdAt: normalizedConfig.createdAt,
      updatedAt: normalizedConfig.updatedAt,
      legacyConfigId,
    });

    if (!persistedProject) {
      throw new Error(`Failed to upsert project for legacy config "${legacyConfigId}"`);
    }

    migrationSummary.projectsUpserted += 1;

    const projectId = persistedProject._id.toHexString();
    const gameConfigEntries: Array<{ gameType: GameType; rules: AnyGameConfig["rules"] }> = [
      { gameType: "journey", rules: normalizedConfig.games.journey },
      { gameType: "battleships", rules: normalizedConfig.games.battleships },
      { gameType: "lotto", rules: normalizedConfig.games.lotto },
    ];

    const migratedGameConfigIds = {} as Record<GameType, string>;

    for (const entry of gameConfigEntries) {
      const persistedGameConfig = await gameConfigsRepository.upsertByLegacyIdentity(
        projectId,
        entry.gameType,
        legacyConfigId,
        createDefaultGameConfig({
          projectId,
          gameType: entry.gameType,
          rules: entry.rules,
          description: normalizedConfig.description,
          createdAt: normalizedConfig.createdAt,
          updatedAt: normalizedConfig.updatedAt,
        }),
      );

      if (!persistedGameConfig) {
        throw new Error(
          `Failed to upsert ${entry.gameType} config for legacy config "${legacyConfigId}" in project "${projectId}"`,
        );
      }

      migratedGameConfigIds[entry.gameType] = persistedGameConfig._id.toHexString();
      migrationSummary.gameConfigsUpserted += 1;
    }

    migrationSummary.journeyGamesUpdated += await migrateGameCollection(mongoDatabase, {
      collectionName: "journey_games",
      legacyConfigId,
      legacyConfigName: normalizedConfig.name,
      legacyProjectCode: projectCode,
      projectId,
      gameConfigId: migratedGameConfigIds.journey,
    });
    migrationSummary.battleshipsGamesUpdated += await migrateGameCollection(mongoDatabase, {
      collectionName: "battleships_games",
      legacyConfigId,
      legacyConfigName: normalizedConfig.name,
      legacyProjectCode: projectCode,
      projectId,
      gameConfigId: migratedGameConfigIds.battleships,
    });
    migrationSummary.lottoGamesUpdated += await migrateGameCollection(mongoDatabase, {
      collectionName: "lotto_games",
      legacyConfigId,
      legacyConfigName: normalizedConfig.name,
      legacyProjectCode: projectCode,
      projectId,
      gameConfigId: migratedGameConfigIds.lotto,
    });
  }

  return migrationSummary;
}
