import { ObjectId, type Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

const APPLY_ARGUMENT = "--apply";
const KEEP_PROJECT_ARGUMENT = "--keep-project=";
const GAME_COLLECTIONS = ["journey_games", "battleships_games", "lotto_games", "lotto_bingo_games", "quizEvents"] as const;

function asRecord(value: unknown): Document | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Document) : null;
}

function asRecords(value: unknown): Document[] {
  return Array.isArray(value) ? value.map(asRecord).filter((entry): entry is Document => entry !== null) : [];
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function collectPlayerReferenceIds(game: Document, collection: (typeof GAME_COLLECTIONS)[number]): string[] {
  if (collection === "battleships_games") return string(game.playerRefId) ? [string(game.playerRefId)] : [];
  if (collection === "journey_games") return asRecords(asRecord(game.stateV2)?.players).map((player) => string(player.playerRefId)).filter(Boolean);
  if (collection === "quizEvents")
    return asRecords(game.questions).flatMap((question) =>
      asRecords(question.selectedAnswers).map((answer) => string(answer.playerRefId)).filter(Boolean),
    );
  return asRecords(game.players).map((player) => string(player.playerRefId)).filter(Boolean);
}

function keepProjectId(): string {
  const argument = process.argv.find((value) => value.startsWith(KEEP_PROJECT_ARGUMENT));
  const projectId = argument?.slice(KEEP_PROJECT_ARGUMENT.length).trim() ?? "";
  if (!ObjectId.isValid(projectId)) throw new Error(`Use ${KEEP_PROJECT_ARGUMENT}<project ObjectId>.`);
  return projectId;
}

async function run(): Promise<void> {
  loadEnvironment();
  const projectIdToKeep = keepProjectId();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  const apply = process.argv.includes(APPLY_ARGUMENT);

  try {
    const [playersToDelete, games] = await Promise.all([
      database.collection<Document>("players").find({ projectId: { $ne: projectIdToKeep } }).toArray(),
      Promise.all(
        GAME_COLLECTIONS.map(async (collection) => ({
          collection,
          games: await database.collection<Document>(collection).find({}).toArray(),
        })),
      ),
    ]);
    const targetIds = new Set(playersToDelete.map((player) => (player._id as ObjectId).toHexString()));
    const references = games.flatMap(({ collection, games: collectionGames }) =>
      collectionGames.flatMap((game) => collectPlayerReferenceIds(game, collection)),
    );
    const referencedTargetIds = [...new Set(references.filter((playerRefId) => targetIds.has(playerRefId)))].sort();
    const report = {
      database: connection.getDatabaseName(),
      projectIdToKeep,
      playersToDelete: playersToDelete
        .map((player) => ({
          id: (player._id as ObjectId).toHexString(),
          projectId: string(player.projectId),
          nickname: string(player.nickname),
        }))
        .sort((left, right) => left.projectId.localeCompare(right.projectId) || left.nickname.localeCompare(right.nickname, "ru")),
      referencedTargetIds,
      applied: false,
    };

    if (!apply) {
      console.log(
        JSON.stringify(
          { ...report, nextStep: `Run again with ${APPLY_ARGUMENT} after verifying no target Player is referenced.` },
          null,
          2,
        ),
      );
      return;
    }
    if (referencedTargetIds.length) {
      console.log(JSON.stringify(report, null, 2));
      throw new Error("Refusing to delete Players that are still referenced by saved games.");
    }
    const deleted = targetIds.size
      ? await database.collection<Document>("players").deleteMany({ _id: { $in: [...targetIds].map((id) => new ObjectId(id)) } })
      : { deletedCount: 0 };
    console.log(JSON.stringify({ ...report, applied: true, deletedPlayers: deleted.deletedCount }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Delete Players outside project failed", error);
  process.exit(1);
});
