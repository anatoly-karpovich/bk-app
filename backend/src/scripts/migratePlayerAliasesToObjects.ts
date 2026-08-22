import { ObjectId, type Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection, getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { normalizePlayerNickname, toPlayerNicknameKey } from "../modules/players/domain/normalizePlayerNickname";
import type { PlayerAlias } from "../modules/players/domain/types";
import { PlayersRepository } from "../modules/players/PlayersRepository";

const APPLY_ARGUMENT = "--apply";
const PLAYERS_COLLECTION = "players";
const LEGACY_INDEX_NAMES = ["projectId_1_aliasKeys_1", "projectId_1_nicknameKey_1"];

interface PlayerAliasMigrationCandidate {
  id: ObjectId;
  aliases: PlayerAlias[];
  needsUpdate: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function aliasesFromDocument(player: Document): PlayerAlias[] {
  const nicknames = new Set<string>();
  const aliases = Array.isArray(player.aliases) ? player.aliases : [];

  for (const alias of aliases) {
    if (typeof alias === "string") nicknames.add(normalizePlayerNickname(alias));
    else {
      const record = asRecord(alias);
      if (typeof record?.nickname === "string") nicknames.add(normalizePlayerNickname(record.nickname));
    }
  }
  if (typeof player.nickname === "string") nicknames.add(normalizePlayerNickname(player.nickname));

  return [...nicknames]
    .filter(Boolean)
    .map((nickname) => ({ nickname, key: toPlayerNicknameKey(nickname) }));
}

function isCurrentAliasShape(value: unknown, expected: PlayerAlias[]): boolean {
  if (!Array.isArray(value) || value.length !== expected.length) return false;
  return value.every((alias, index) => {
    const record = asRecord(alias);
    return record?.nickname === expected[index].nickname && record.key === expected[index].key;
  });
}

function findAliasConflicts(players: Document[], candidates: PlayerAliasMigrationCandidate[]): Array<{ projectId: string; key: string; playerIds: string[] }> {
  const playerIdsByAlias = new Map<string, Set<string>>();
  const projectByPlayerId = new Map(players.map((player) => [player._id.toHexString(), player.projectId]));
  for (const candidate of candidates) {
    const projectId = projectByPlayerId.get(candidate.id.toHexString());
    if (typeof projectId !== "string") continue;
    for (const alias of candidate.aliases) {
      const mapKey = `${projectId}\u0000${alias.key}`;
      const playerIds = playerIdsByAlias.get(mapKey) ?? new Set<string>();
      playerIds.add(candidate.id.toHexString());
      playerIdsByAlias.set(mapKey, playerIds);
    }
  }
  return [...playerIdsByAlias.entries()]
    .flatMap(([mapKey, playerIds]) => {
      if (playerIds.size < 2) return [];
      const [projectId, key] = mapKey.split("\u0000");
      return [{ projectId, key, playerIds: [...playerIds].sort() }];
    })
    .sort((left, right) => left.projectId.localeCompare(right.projectId) || left.key.localeCompare(right.key, "ru"));
}

async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  const collection = database.collection<Document>(PLAYERS_COLLECTION);
  const playersRepository = new PlayersRepository(getDefaultMongoDatabase());

  try {
    const players = await collection.find({}).toArray();
    const candidates = players.map((player) => {
      const aliases = aliasesFromDocument(player);
      return {
        id: player._id,
        aliases,
        needsUpdate:
          !isCurrentAliasShape(player.aliases, aliases) || "aliasKeys" in player || "nicknameKey" in player,
      };
    });
    const invalidPlayers = candidates.filter((candidate) => !candidate.aliases.length).map((candidate) => candidate.id.toHexString());
    const conflicts = findAliasConflicts(players, candidates);
    const indexes = await collection.listIndexes().toArray();
    const report = {
      database: connection.getDatabaseName(),
      players: players.length,
      playersToConvert: candidates.filter((candidate) => candidate.needsUpdate).length,
      invalidPlayers,
      aliasConflicts: conflicts,
      legacyIndexes: indexes.map((index) => index.name).filter((name) => LEGACY_INDEX_NAMES.includes(name)),
      applied: false,
    };

    if (!process.argv.includes(APPLY_ARGUMENT)) {
      console.log(
        JSON.stringify(
          { ...report, nextStep: `Run again with ${APPLY_ARGUMENT} to replace parallel alias arrays with alias objects.` },
          null,
          2,
        ),
      );
      return;
    }
    if (invalidPlayers.length || conflicts.length) {
      throw new Error("Refusing alias migration because invalid players or duplicate project alias keys were found.");
    }

    const now = new Date().toISOString();
    for (const candidate of candidates.filter((item) => item.needsUpdate)) {
      await collection.updateOne(
        { _id: candidate.id },
        {
          $set: { aliases: candidate.aliases, updatedAt: now },
        },
      );
    }
    await playersRepository.ensureIndexes();
    for (const name of LEGACY_INDEX_NAMES) {
      if (indexes.some((index) => index.name === name)) await collection.dropIndex(name);
    }
    await collection.updateMany(
      { $or: [{ aliasKeys: { $exists: true } }, { nicknameKey: { $exists: true } }] },
      { $unset: { aliasKeys: "", nicknameKey: "" } },
    );

    console.log(JSON.stringify({ ...report, applied: true }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Player alias object migration failed", error);
  process.exit(1);
});
