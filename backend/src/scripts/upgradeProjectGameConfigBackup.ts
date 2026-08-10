import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BSON, type Document, type ObjectId } from "mongodb";
import { normalizeBattleshipsRules } from "../modules/battleships/domain/config";
import type { BattleshipsRulesInput } from "../modules/battleships/domain/types";
import { normalizeJourneyRules } from "../modules/journey/domain/config";
import type { JourneyRulesInput } from "../modules/journey/domain/types";
import { normalizeLottoRules } from "../modules/lotto/domain/config";
import type { LottoRulesInput } from "../modules/lotto/domain/types";
import { collectCurrencyIdsFromRules } from "../modules/gameConfigs/domain/currencyReferences";
import type { GameType } from "../modules/gameConfigs/domain/types";
import { normalizeProjectCurrencies } from "../modules/projects/domain/normalizeProjectCurrencies";
import type { ProjectCurrency } from "../modules/projects/domain/types";

const V1_FORMAT = "project-game-config-backup-v1";
const V2_FORMAT = "project-game-config-backup-v2";
const COLLECTIONS = ["projects", "game_configs", "journey_games", "battleships_games", "lotto_games"] as const;

type CollectionName = (typeof COLLECTIONS)[number];
type BackupDocument = Document & { _id: ObjectId };

interface BackupManifestCollection {
  name: CollectionName;
  documents: number;
  indexes: number;
  dataFile: string;
  indexesFile?: string;
}

interface BackupManifest {
  exportedAt: string;
  dbName: string;
  collections: BackupManifestCollection[];
}

interface ImportReport {
  importFormat: string;
  unresolved?: Record<string, unknown>;
}

function getRequiredArgument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) {
    throw new Error(`Missing required argument ${name}`);
  }
  return path.resolve(value);
}

function getString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Expected a non-empty string field '${field}'`);
  }
  return value.trim();
}

function getTimestamp(document: BackupDocument): string {
  if (typeof document.updatedAt === "string") {
    return document.updatedAt;
  }
  if (typeof document.createdAt === "string") {
    return document.createdAt;
  }
  return document._id.getTimestamp().toISOString();
}

function getDecimalPlaces(value: number): number {
  const text = String(Math.abs(value));
  if (text.includes("e-")) {
    return Number(text.split("e-")[1]);
  }
  const fraction = text.split(".")[1];
  return fraction ? fraction.length : 0;
}

function getFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value && typeof value === "object" && "valueOf" in value && typeof value.valueOf === "function") {
    const normalized = value.valueOf();
    return typeof normalized === "number" && Number.isFinite(normalized) ? normalized : null;
  }
  return null;
}

function collectCurrencyPrecisions(value: unknown, result = new Map<string, number>(), visited = new Set<unknown>()) {
  if (!value || typeof value !== "object" || visited.has(value)) {
    return result;
  }

  visited.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => collectCurrencyPrecisions(item, result, visited));
    return result;
  }

  const record = value as Record<string, unknown>;
  const numericValue = getFiniteNumber(record.value);
  if (typeof record.currencyId === "string" && numericValue !== null) {
    result.set(record.currencyId, Math.max(result.get(record.currencyId) ?? 0, getDecimalPlaces(numericValue)));
  }
  Object.values(record).forEach((item) => collectCurrencyPrecisions(item, result, visited));
  return result;
}

function normalizeRules(gameType: GameType, rules: unknown) {
  switch (gameType) {
    case "journey":
      return normalizeJourneyRules(rules as JourneyRulesInput);
    case "battleships":
      return normalizeBattleshipsRules(rules as BattleshipsRulesInput);
    case "lotto":
      return normalizeLottoRules(rules as LottoRulesInput);
  }
}

function validateRulesCurrencies(rules: unknown, currencies: ProjectCurrency[], context: string): void {
  const currenciesById = new Map(currencies.map((currency) => [currency.id, currency]));
  const currencyIds = collectCurrencyIdsFromRules(rules);
  for (const currencyId of currencyIds) {
    if (!currenciesById.has(currencyId)) {
      throw new Error(`${context}: unknown project currency '${currencyId}'`);
    }
  }

  const visited = new Set<unknown>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object" || visited.has(value)) {
      return;
    }
    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    const numericValue = getFiniteNumber(record.value);
    if (typeof record.currencyId === "string" && numericValue !== null) {
      const currency = currenciesById.get(record.currencyId)!;
      if (!Number.isInteger(numericValue * 10 ** currency.precision)) {
        throw new Error(`${context}: invalid value for currency '${record.currencyId}'`);
      }
    }
    Object.values(record).forEach(visit);
  };

  visit(rules);
}

async function readEjsonArray(filePath: string): Promise<BackupDocument[]> {
  const parsed = BSON.EJSON.parse(await readFile(filePath, "utf8"), { relaxed: false });
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected an EJSON array in ${path.basename(filePath)}`);
  }
  return parsed as BackupDocument[];
}

async function writeEjsonArray(directory: string, fileName: string, documents: unknown[]): Promise<void> {
  await writeFile(path.join(directory, fileName), BSON.EJSON.stringify(documents, { relaxed: false }), "utf8");
}

async function assertOutputDoesNotExist(outputDirectory: string): Promise<void> {
  try {
    await access(outputDirectory);
    throw new Error(`Refusing to overwrite existing backup directory: ${outputDirectory}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Refusing to overwrite")) {
      throw error;
    }
  }
}

async function run(): Promise<void> {
  const sourceDirectory = getRequiredArgument("--source");
  const outputDirectory = getRequiredArgument("--output");
  if (sourceDirectory === outputDirectory) {
    throw new Error("--output must be different from --source");
  }
  await assertOutputDoesNotExist(outputDirectory);

  const [manifest, importReport] = await Promise.all([
    readFile(path.join(sourceDirectory, "manifest.json"), "utf8").then((value) => JSON.parse(value) as BackupManifest),
    readFile(path.join(sourceDirectory, "import-report.json"), "utf8").then(
      (value) => JSON.parse(value) as ImportReport,
    ),
  ]);
  if (importReport.importFormat !== V1_FORMAT) {
    throw new Error(`Expected ${V1_FORMAT}, received ${importReport.importFormat ?? "missing format"}`);
  }

  const entries = new Map(manifest.collections.map((entry) => [entry.name, entry]));
  const sourceDocuments = new Map<CollectionName, BackupDocument[]>();
  const sourceIndexes = new Map<CollectionName, BackupDocument[]>();
  for (const collectionName of COLLECTIONS) {
    const entry = entries.get(collectionName);
    if (!entry) {
      throw new Error(`Backup manifest does not contain ${collectionName}`);
    }
    sourceDocuments.set(collectionName, await readEjsonArray(path.join(sourceDirectory, entry.dataFile)));
    sourceIndexes.set(
      collectionName,
      entry.indexesFile ? await readEjsonArray(path.join(sourceDirectory, entry.indexesFile)) : [],
    );
  }

  const configs = sourceDocuments.get("game_configs")!;
  const configsByProjectId = new Map<string, BackupDocument[]>();
  configs.forEach((config) => {
    const projectId = getString(config.projectId, "game_configs.projectId");
    configsByProjectId.set(projectId, [...(configsByProjectId.get(projectId) ?? []), config]);
  });

  const projects = sourceDocuments.get("projects")!.map((project) => {
    const id = project._id.toHexString();
    const timestamp = getTimestamp(project);
    const requiredPrecisions = (configsByProjectId.get(id) ?? []).reduce(
      (result, config) => collectCurrencyPrecisions(config.rules, result),
      new Map<string, number>(),
    );
    const sourceCurrencies = Array.isArray(project.currencies) ? project.currencies : [];
    const currencies = normalizeProjectCurrencies(
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
    if (!currencies.length) {
      throw new Error(`Project ${id} has no currencies`);
    }
    return {
      _id: project._id,
      code: getString(project.code, "projects.code"),
      name: getString(project.name, "projects.name"),
      description: typeof project.description === "string" ? project.description.trim() : "",
      currencies,
      createdAt: typeof project.createdAt === "string" ? project.createdAt : timestamp,
      updatedAt: timestamp,
    };
  });
  const currenciesByProjectId = new Map(projects.map((project) => [project._id.toHexString(), project.currencies]));

  const gameConfigs = configs.map((config) => {
    const projectId = getString(config.projectId, "game_configs.projectId");
    const gameType = getString(config.gameType, "game_configs.gameType") as GameType;
    if (!["journey", "battleships", "lotto"].includes(gameType)) {
      throw new Error(`Unsupported game type '${gameType}' in config ${config._id.toHexString()}`);
    }
    const rules = normalizeRules(gameType, config.rules);
    validateRulesCurrencies(rules, currenciesByProjectId.get(projectId) ?? [], `Config ${config._id.toHexString()}`);
    const timestamp = getTimestamp(config);
    return {
      _id: config._id,
      projectId,
      gameType,
      name: getString(config.name, "game_configs.name"),
      description: typeof config.description === "string" ? config.description.trim() : "",
      rules,
      createdAt: typeof config.createdAt === "string" ? config.createdAt : timestamp,
      updatedAt: timestamp,
    };
  });

  await mkdir(outputDirectory, { recursive: false });
  const documentsByCollection = new Map<CollectionName, unknown[]>([
    ["projects", projects],
    ["game_configs", gameConfigs],
    ["journey_games", sourceDocuments.get("journey_games")!],
    ["battleships_games", sourceDocuments.get("battleships_games")!],
    ["lotto_games", sourceDocuments.get("lotto_games")!],
  ]);
  const outputCollections: BackupManifestCollection[] = [];
  for (const collectionName of COLLECTIONS) {
    const documents = documentsByCollection.get(collectionName)!;
    const indexes = sourceIndexes.get(collectionName)!;
    const dataFile = `${collectionName}.data.ejson`;
    const indexesFile = `${collectionName}.indexes.ejson`;
    await Promise.all([
      writeEjsonArray(outputDirectory, dataFile, documents),
      writeEjsonArray(outputDirectory, indexesFile, indexes),
    ]);
    outputCollections.push({
      name: collectionName,
      documents: documents.length,
      indexes: indexes.length,
      dataFile,
      indexesFile,
    });
  }
  await writeFile(
    path.join(outputDirectory, "manifest.json"),
    JSON.stringify(
      { exportedAt: manifest.exportedAt, dbName: manifest.dbName, collections: outputCollections },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(
    path.join(outputDirectory, "import-report.json"),
    JSON.stringify(
      { importFormat: V2_FORMAT, upgradedFrom: V1_FORMAT, unresolved: importReport.unresolved ?? {} },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        sourceDirectory,
        outputDirectory,
        projects: projects.length,
        gameConfigs: gameConfigs.length,
        format: V2_FORMAT,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error("Project game-config backup upgrade failed", error);
  process.exit(1);
});
