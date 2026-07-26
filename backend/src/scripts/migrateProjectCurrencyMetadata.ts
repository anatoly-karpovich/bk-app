import type { Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";
import { normalizeProjectCurrencies } from "../modules/projects/domain/normalizeProjectCurrencies";
import type { ProjectCurrency } from "../modules/projects/domain/types";

const APPLY_ARGUMENT = "--apply";

function getFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value && typeof value === "object" && "valueOf" in value && typeof value.valueOf === "function") {
    const normalizedValue = value.valueOf();
    return typeof normalizedValue === "number" && Number.isFinite(normalizedValue) ? normalizedValue : null;
  }

  return null;
}

function getDecimalPlaces(value: number): number {
  const valueText = String(Math.abs(value));
  if (valueText.includes("e-")) {
    return Number(valueText.split("e-")[1]);
  }

  return valueText.split(".")[1]?.length ?? 0;
}

function collectRequiredPrecisions(
  value: unknown,
  result = new Map<string, number>(),
  visited = new Set<unknown>(),
): Map<string, number> {
  if (!value || typeof value !== "object" || visited.has(value)) {
    return result;
  }

  visited.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => collectRequiredPrecisions(item, result, visited));
    return result;
  }

  const record = value as Record<string, unknown>;
  const numericValue = getFiniteNumber(record.value);
  if (typeof record.currencyId === "string" && numericValue !== null) {
    result.set(record.currencyId, Math.max(result.get(record.currencyId) ?? 0, getDecimalPlaces(numericValue)));
  }

  Object.values(record).forEach((item) => collectRequiredPrecisions(item, result, visited));
  return result;
}

function requiresUpgrade(source: unknown, normalized: ProjectCurrency): boolean {
  if (!source || typeof source !== "object") {
    return true;
  }

  const sourceCurrency = source as Partial<ProjectCurrency>;
  return (
    sourceCurrency.id !== normalized.id ||
    sourceCurrency.code !== normalized.code ||
    sourceCurrency.name !== normalized.name ||
    sourceCurrency.label !== normalized.label ||
    sourceCurrency.valueType !== normalized.valueType ||
    sourceCurrency.precision !== normalized.precision ||
    sourceCurrency.createdAt !== normalized.createdAt ||
    sourceCurrency.updatedAt !== normalized.updatedAt
  );
}

async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  const projects = database.collection<Document>("projects");
  const gameConfigs = database.collection<Document>("game_configs");

  try {
    const [projectDocuments, gameConfigDocuments] = await Promise.all([
      projects.find({}).toArray(),
      gameConfigs.find({}).toArray(),
    ]);
    const rulesByProjectId = new Map<string, unknown[]>();

    gameConfigDocuments.forEach((gameConfig) => {
      if (typeof gameConfig.projectId !== "string") {
        return;
      }

      rulesByProjectId.set(gameConfig.projectId, [...(rulesByProjectId.get(gameConfig.projectId) ?? []), gameConfig.rules]);
    });

    const migrationCandidates = projectDocuments.flatMap((project) => {
      const sourceCurrencies = Array.isArray(project.currencies) ? project.currencies : [];
      const requiredPrecisions = (rulesByProjectId.get(project._id.toHexString()) ?? []).reduce<Map<string, number>>(
        (result, rules) => collectRequiredPrecisions(rules, result),
        new Map<string, number>(),
      );
      const timestamp = typeof project.updatedAt === "string" ? project.updatedAt : new Date().toISOString();
      const normalizedCurrencies = normalizeProjectCurrencies(
        sourceCurrencies.map((currency) => {
          const sourceCurrency = currency as Partial<ProjectCurrency>;
          const precision = Math.max(
            getFiniteNumber(sourceCurrency.precision) ?? 0,
            requiredPrecisions.get(sourceCurrency.id ?? "") ?? 0,
          );

          return {
            ...sourceCurrency,
            precision,
            valueType: precision > 0 ? "decimal" : "integer",
          };
        }),
        timestamp,
      );

      return sourceCurrencies.some((currency, index) => requiresUpgrade(currency, normalizedCurrencies[index]))
        ? [{ project, normalizedCurrencies }]
        : [];
    });

    if (!process.argv.includes(APPLY_ARGUMENT)) {
      console.log(
        JSON.stringify(
          {
            database: connection.getDatabaseName(),
            projectsToUpdate: migrationCandidates.length,
            applied: false,
            nextStep: `Run again with ${APPLY_ARGUMENT} to add missing currency metadata.`,
          },
          null,
          2,
        ),
      );
      return;
    }

    for (const { project, normalizedCurrencies } of migrationCandidates) {
      await projects.updateOne(
        { _id: project._id },
        {
          $set: {
            currencies: normalizedCurrencies,
            updatedAt: new Date().toISOString(),
          },
        },
      );
    }

    console.log(
      JSON.stringify(
        {
          database: connection.getDatabaseName(),
          modifiedProjects: migrationCandidates.length,
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
  console.error("Project currency metadata migration failed", error);
  process.exit(1);
});
