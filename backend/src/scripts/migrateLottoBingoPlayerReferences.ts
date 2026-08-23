import type { Document, ObjectId } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection, getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { toPlayerNicknameKey } from "../modules/players/domain/normalizePlayerNickname";
import { PlayersRepository } from "../modules/players/PlayersRepository";

const APPLY_ARGUMENT = "--apply";
const LOTTO_BINGO_GAMES_COLLECTION = "lotto_bingo_games";

interface UnresolvedPlayerReference {
  gameId: string;
  playerId: string;
  nickname: string;
  reason: "missing_project_id" | "empty_nickname" | "player_not_found";
}

interface ConflictingPlayerReference {
  gameId: string;
  playerId: string;
  nickname: string;
  existingPlayerRefId: string;
  resolvedPlayerRefId: string;
}

interface GameUpdate {
  id: ObjectId;
  projectId: string;
  revision: number;
  players: Document[];
}

function asRecord(value: unknown): Document | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Document) : null;
}

function asRecords(value: unknown): Document[] {
  return Array.isArray(value) ? value.map(asRecord).filter((entry): entry is Document => entry !== null) : [];
}

function gameId(game: Document): string {
  return game._id && typeof game._id === "object" && "toHexString" in game._id
    ? (game._id as ObjectId).toHexString()
    : String(game._id ?? "unknown");
}

function existingPlayerRefId(player: Document): string | null {
  return typeof player.playerRefId === "string" && player.playerRefId ? player.playerRefId : null;
}

async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  const playersRepository = new PlayersRepository(getDefaultMongoDatabase());
  const apply = process.argv.includes(APPLY_ARGUMENT);

  try {
    const games = await database.collection<Document>(LOTTO_BINGO_GAMES_COLLECTION).find({}).toArray();
    const updates: GameUpdate[] = [];
    const unresolved: UnresolvedPlayerReference[] = [];
    const conflicts: ConflictingPlayerReference[] = [];
    let playersScanned = 0;
    let alreadyLinked = 0;
    let playerReferencesToAdd = 0;

    for (const game of games) {
      const id = gameId(game);
      const players = asRecords(game.players);
      const projectId = typeof game.projectId === "string" ? game.projectId : "";
      const revision = typeof game.revision === "number" && Number.isInteger(game.revision) && game.revision >= 0 ? game.revision : null;
      let changed = false;
      const nextPlayers: Document[] = [];

      for (const player of players) {
        playersScanned += 1;
        const playerId = typeof player.id === "string" ? player.id : "unknown";
        const nickname = typeof player.nickname === "string" ? player.nickname : "";

        if (!projectId) {
          unresolved.push({ gameId: id, playerId, nickname, reason: "missing_project_id" });
          nextPlayers.push(player);
          continue;
        }
        const nicknameKey = toPlayerNicknameKey(nickname);
        if (!nicknameKey) {
          unresolved.push({ gameId: id, playerId, nickname, reason: "empty_nickname" });
          nextPlayers.push(player);
          continue;
        }

        const matchedPlayer = await playersRepository.findByProjectIdAndNicknameKey(projectId, nicknameKey);
        if (!matchedPlayer) {
          unresolved.push({ gameId: id, playerId, nickname, reason: "player_not_found" });
          nextPlayers.push(player);
          continue;
        }

        const resolvedPlayerRefId = matchedPlayer._id.toHexString();
        const existingRefId = existingPlayerRefId(player);
        if (existingRefId === resolvedPlayerRefId) {
          alreadyLinked += 1;
          nextPlayers.push(player);
          continue;
        }
        if (existingRefId) {
          conflicts.push({
            gameId: id,
            playerId,
            nickname,
            existingPlayerRefId: existingRefId,
            resolvedPlayerRefId,
          });
          nextPlayers.push(player);
          continue;
        }

        changed = true;
        playerReferencesToAdd += 1;
        nextPlayers.push({ ...player, playerRefId: resolvedPlayerRefId });
      }

      if (!changed) continue;
      if (revision === null) {
        conflicts.push({
          gameId: id,
          playerId: "unknown",
          nickname: "",
          existingPlayerRefId: "invalid_or_missing_revision",
          resolvedPlayerRefId: "not_updated",
        });
        continue;
      }
      updates.push({ id: game._id as ObjectId, projectId, revision, players: nextPlayers });
    }

    const report = {
      database: connection.getDatabaseName(),
      gamesScanned: games.length,
      playersScanned,
      gamesToUpdate: updates.length,
      playerReferencesToAdd,
      alreadyLinked,
      unresolved,
      conflicts,
      applied: false,
    };

    if (!apply) {
      console.log(
        JSON.stringify(
          {
            ...report,
            nextStep: `Run again with ${APPLY_ARGUMENT} to write resolved player references.`,
          },
          null,
          2,
        ),
      );
      return;
    }
    if (conflicts.length) {
      console.log(JSON.stringify(report, null, 2));
      throw new Error("Refusing Lotto Bingo player-reference migration because conflicting references were found.");
    }

    const updatedAt = new Date().toISOString();
    for (const update of updates) {
      const result = await database.collection<Document>(LOTTO_BINGO_GAMES_COLLECTION).updateOne(
        { _id: update.id, projectId: update.projectId, revision: update.revision },
        { $set: { players: update.players, updatedAt }, $inc: { revision: 1 } },
      );
      if (result.modifiedCount !== 1) {
        throw new Error(`Lotto Bingo game ${update.id.toHexString()} changed during player-reference migration.`);
      }
    }
    console.log(JSON.stringify({ ...report, applied: true, modifiedGames: updates.length }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Lotto Bingo player-reference migration failed", error);
  process.exit(1);
});
