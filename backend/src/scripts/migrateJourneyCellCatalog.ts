import type { Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

const APPLY_ARGUMENT = "--apply";
const CORE_IDS = new Set(["small", "medium", "large"]);

type CellRecord = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getKind(value: unknown): "bonus" | "trap" {
  return value === "trap" ? "trap" : "bonus";
}

function normalizeCellId(kind: "bonus" | "trap", value: unknown): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (CORE_IDS.has(id)) return id;
  const legacyPrefix = `${kind}_`;
  const legacySuffix = id.startsWith(legacyPrefix) ? id.slice(legacyPrefix.length) : "";
  return CORE_IDS.has(legacySuffix) ? legacySuffix : id;
}

function getMapLabel(id: string, existingValue: unknown): string {
  if (CORE_IDS.has(id)) return id.slice(0, 1).toUpperCase();
  if (typeof existingValue === "string" && existingValue.trim()) return existingValue.trim();
  return Array.from(id).slice(0, 3).join("").toUpperCase() || "?";
}

function migrateCells(source: unknown): { cells: CellRecord[]; changed: boolean } | null {
  if (!Array.isArray(source)) return null;

  let changed = false;
  const cells = source.map((value) => {
    if (!isRecord(value)) return value as CellRecord;
    const kind = getKind(value.kind);
    const id = normalizeCellId(kind, value.id);
    const mapLabel = getMapLabel(id, value.mapLabel);
    const next = { ...value, id, mapLabel };
    changed ||= value.id !== id || value.mapLabel !== mapLabel;
    return next;
  });

  return { cells, changed };
}

function migrateRules(source: unknown): { rules: Document; changed: boolean } | null {
  if (!isRecord(source)) return null;
  const result = migrateCells(source.cells);
  if (!result) return null;
  return { rules: { ...source, cells: result.cells }, changed: result.changed };
}

function getCellLabels(rules: Document): Map<string, { id: string; mapLabel: string }> {
  const labels = new Map<string, { id: string; mapLabel: string }>();
  const cells = migrateCells(rules.cells)?.cells ?? [];
  cells.forEach((cell) => {
    const kind = getKind(cell.kind);
    const id = typeof cell.id === "string" ? cell.id : "";
    labels.set(`${kind}:${id}`, { id, mapLabel: getMapLabel(id, cell.mapLabel) });
  });
  return labels;
}

function migrateBoard(source: unknown, rules: Document): { board: Document; changed: boolean } | null {
  if (!isRecord(source)) return null;
  const labels = getCellLabels(rules);
  let changed = false;
  const board = Object.fromEntries(
    Object.entries(source).map(([position, value]) => {
      if (!isRecord(value)) return [position, value];
      if (value.isJackpot) {
        const next = { ...value, mapLabel: "🏆" };
        changed ||= value.mapLabel !== "🏆";
        return [position, next];
      }
      const kind = getKind(value.kind);
      const normalizedId = normalizeCellId(kind, value.id);
      const label = labels.get(`${kind}:${normalizedId}`)?.mapLabel ?? getMapLabel(normalizedId, value.mapLabel);
      const next = { ...value, id: normalizedId, mapLabel: label };
      changed ||= value.id !== normalizedId || value.mapLabel !== label;
      return [position, next];
    }),
  );
  return { board, changed };
}

async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  const gameConfigs = database.collection<Document>("game_configs");
  const journeyGames = database.collection<Document>("journey_games");

  try {
    const [configDocuments, gameDocuments] = await Promise.all([
      gameConfigs.find({ gameType: "journey" }).toArray(),
      journeyGames.find({}).toArray(),
    ]);
    const configUpdates = configDocuments.flatMap((config) => {
      const result = migrateRules(config.rules);
      return result?.changed ? [{ id: config._id, rules: result.rules }] : [];
    });
    const gameUpdates = gameDocuments.flatMap((game) => {
      const rulesResult = migrateRules(game.rules);
      const rules = rulesResult?.rules ?? (isRecord(game.rules) ? game.rules : null);
      const boardResult = rules ? migrateBoard((game.stateV2 as Document | undefined)?.map, rules) : null;
      return rules && (rulesResult?.changed || boardResult?.changed)
        ? [{ id: game._id, rules, board: boardResult?.board ?? (game.stateV2 as Document).map }]
        : [];
    });

    if (!process.argv.includes(APPLY_ARGUMENT)) {
      console.log(
        JSON.stringify(
          {
            database: connection.getDatabaseName(),
            journeyConfigsToUpdate: configUpdates.length,
            journeyGamesToUpdate: gameUpdates.length,
            applied: false,
            nextStep: `Run again with ${APPLY_ARGUMENT} to migrate cell IDs and map labels.`,
          },
          null,
          2,
        ),
      );
      return;
    }

    const timestamp = new Date().toISOString();
    for (const update of configUpdates) {
      await gameConfigs.updateOne({ _id: update.id }, { $set: { rules: update.rules, updatedAt: timestamp } });
    }
    for (const update of gameUpdates) {
      await journeyGames.updateOne(
        { _id: update.id },
        { $set: { rules: update.rules, "stateV2.map": update.board, updatedAt: timestamp } },
      );
    }
    console.log(
      JSON.stringify(
        {
          database: connection.getDatabaseName(),
          modifiedJourneyConfigs: configUpdates.length,
          modifiedJourneyGames: gameUpdates.length,
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
  console.error("Journey cell catalog migration failed", error);
  process.exit(1);
});
