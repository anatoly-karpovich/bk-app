import { ObjectId, type Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection, getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { normalizePlayerNickname, toPlayerNicknameKey } from "../modules/players/domain/normalizePlayerNickname";
import { PlayersRepository } from "../modules/players/PlayersRepository";

const APPLY_ARGUMENT = "--apply";
const PLAYERS_COLLECTION = "players";
const LEGACY_ALIAS_INDEX_NAME = "projectId_1_aliases.key_1";
const CURRENT_NICKNAME_INDEX_NAME = "projectId_1_nicknameKey_1";

interface PlayerCandidate {
  id: ObjectId;
  projectId: string;
  nicknameKey: string;
  needsUpdate: boolean;
}

function findCurrentNicknameConflicts(
  candidates: PlayerCandidate[],
): Array<{ projectId: string; nicknameKey: string; playerIds: string[] }> {
  const idsByKey = new Map<string, string[]>();
  for (const candidate of candidates) {
    if (!candidate.projectId || !candidate.nicknameKey) continue;
    const key = `${candidate.projectId}\u0000${candidate.nicknameKey}`;
    const ids = idsByKey.get(key) ?? [];
    ids.push(candidate.id.toHexString());
    idsByKey.set(key, ids);
  }
  return [...idsByKey.entries()]
    .flatMap(([key, playerIds]) => {
      if (playerIds.length < 2) return [];
      const [projectId, nicknameKey] = key.split("\u0000");
      return [{ projectId, nicknameKey, playerIds: playerIds.sort() }];
    })
    .sort(
      (left, right) =>
        left.projectId.localeCompare(right.projectId) || left.nicknameKey.localeCompare(right.nicknameKey, "ru"),
    );
}

async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  const collection = database.collection<Document>(PLAYERS_COLLECTION);
  const playersRepository = new PlayersRepository(getDefaultMongoDatabase());
  const apply = process.argv.includes(APPLY_ARGUMENT);

  try {
    const [players, indexes] = await Promise.all([collection.find({}).toArray(), collection.listIndexes().toArray()]);
    const candidates: PlayerCandidate[] = players.map((player) => {
      const nickname = typeof player.nickname === "string" ? normalizePlayerNickname(player.nickname) : "";
      const nicknameKey = toPlayerNicknameKey(nickname);
      return {
        id: player._id as ObjectId,
        projectId: typeof player.projectId === "string" ? player.projectId : "",
        nicknameKey,
        needsUpdate: player.nicknameKey !== nicknameKey,
      };
    });
    const invalidPlayers = candidates
      .filter((candidate) => !candidate.projectId || !candidate.nicknameKey)
      .map((candidate) => candidate.id.toHexString());
    const currentNicknameConflicts = findCurrentNicknameConflicts(candidates);
    const legacyAliasUniqueIndex = indexes.find(
      (index) => index.name === LEGACY_ALIAS_INDEX_NAME && index.unique === true,
    );
    const currentNicknameIndex = indexes.find((index) => index.name === CURRENT_NICKNAME_INDEX_NAME);
    const report = {
      database: connection.getDatabaseName(),
      players: players.length,
      playersToUpdate: candidates.filter((candidate) => candidate.needsUpdate).length,
      invalidPlayers,
      currentNicknameConflicts,
      legacyAliasUniqueIndexPresent: Boolean(legacyAliasUniqueIndex),
      currentNicknameIndexPresent: Boolean(currentNicknameIndex),
      currentNicknameIndexNeedsReplacement: Boolean(currentNicknameIndex && currentNicknameIndex.unique !== true),
      applied: false,
    };

    if (!apply) {
      console.log(
        JSON.stringify(
          {
            ...report,
            nextStep: `Run again with ${APPLY_ARGUMENT} to make current nickname the only unique player identity key.`,
          },
          null,
          2,
        ),
      );
      return;
    }
    if (invalidPlayers.length || currentNicknameConflicts.length) {
      console.log(JSON.stringify(report, null, 2));
      throw new Error("Refusing player current-nickname migration because invalid players or duplicate current nicknames were found.");
    }

    const updatedAt = new Date().toISOString();
    for (const candidate of candidates.filter((candidate) => candidate.needsUpdate)) {
      await collection.updateOne({ _id: candidate.id }, { $set: { nicknameKey: candidate.nicknameKey, updatedAt } });
    }
    if (legacyAliasUniqueIndex) await collection.dropIndex(LEGACY_ALIAS_INDEX_NAME);
    if (currentNicknameIndex && currentNicknameIndex.unique !== true)
      await collection.dropIndex(CURRENT_NICKNAME_INDEX_NAME);
    await playersRepository.ensureIndexes();

    console.log(JSON.stringify({ ...report, applied: true, modifiedPlayers: candidates.filter((candidate) => candidate.needsUpdate).length }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Player current-nickname migration failed", error);
  process.exit(1);
});
