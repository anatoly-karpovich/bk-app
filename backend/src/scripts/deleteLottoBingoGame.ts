import { ObjectId, type Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

const APPLY_ARGUMENT = "--apply";
const GAME_ID_ARGUMENT = "--game-id=";
const COLLECTION = "lotto_bingo_games";

function gameId(): ObjectId {
  const argument = process.argv.find((value) => value.startsWith(GAME_ID_ARGUMENT));
  const value = argument?.slice(GAME_ID_ARGUMENT.length).trim() ?? "";
  if (!ObjectId.isValid(value)) throw new Error(`Use ${GAME_ID_ARGUMENT}<Lotto Bingo game ObjectId>.`);
  return new ObjectId(value);
}

async function run(): Promise<void> {
  loadEnvironment();
  const id = gameId();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  const apply = process.argv.includes(APPLY_ARGUMENT);

  try {
    const collection = database.collection<Document>(COLLECTION);
    const game = await collection.findOne({ _id: id });
    if (!game) throw new Error(`Lotto Bingo game ${id.toHexString()} was not found.`);
    const projectId = typeof game.projectId === "string" ? game.projectId : "";
    const revision = typeof game.revision === "number" && Number.isInteger(game.revision) ? game.revision : null;
    if (!projectId || revision === null) throw new Error(`Lotto Bingo game ${id.toHexString()} has invalid project or revision data.`);
    const report = {
      database: connection.getDatabaseName(),
      gameId: id.toHexString(),
      projectId,
      revision,
      playersCount: Array.isArray(game.players) ? game.players.length : 0,
      status: game.status ?? null,
      applied: false,
    };
    if (!apply) {
      console.log(JSON.stringify({ ...report, nextStep: `Run again with ${APPLY_ARGUMENT} to delete this Lotto Bingo game.` }, null, 2));
      return;
    }
    const result = await collection.deleteOne({ _id: id, projectId, revision });
    if (result.deletedCount !== 1)
      throw new Error(`Lotto Bingo game ${id.toHexString()} changed during deletion and was not removed.`);
    console.log(JSON.stringify({ ...report, applied: true, deletedGames: 1 }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Delete Lotto Bingo game failed", error);
  process.exit(1);
});
