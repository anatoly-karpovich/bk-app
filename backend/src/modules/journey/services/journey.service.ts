import { ObjectId, WithId } from "mongodb";
import { getMongoCollection } from "../../../lib/mongo";
import { createJourneyGame, makeJourneyRound, normalizeJourneyGame, removeJourneyPlayer } from "../domain/engine";
import { parseMovesFromForum, parsePlayerNamesFromForum } from "../domain/parsers";
import type { JourneyGame, JourneyMoveInput, JourneyRules, JourneyRuleset } from "../domain/types";

const JOURNEY_GAMES_COLLECTION = "journey_games";

export interface JourneyGameResponse extends JourneyGame {
  id: string;
}

interface JourneyGameDocument extends JourneyGame {
  createdAt: string;
  updatedAt: string;
}

interface CreateJourneyGamePayload {
  nicknames: string[];
  rules?: JourneyRules;
  rulesetId?: JourneyRuleset["id"];
  rulesetName?: JourneyRuleset["name"];
}

interface SaveJourneyRoundPayload {
  moves: JourneyMoveInput[];
  skippedPlayerIds?: string[];
}

function getJourneyGamesCollection() {
  return getMongoCollection<JourneyGameDocument>(JOURNEY_GAMES_COLLECTION);
}

function serializeJourneyGame(document: WithId<JourneyGameDocument>): JourneyGameResponse {
  const { _id, ...game } = document;

  return {
    id: _id.toHexString(),
    ...game,
  };
}

function assertObjectId(gameId: string): ObjectId {
  if (!ObjectId.isValid(gameId)) {
    throw new Error("Invalid game id");
  }

  return new ObjectId(gameId);
}

async function getJourneyGameDocumentById(gameId: string): Promise<WithId<JourneyGameDocument> | null> {
  const collection = await getJourneyGamesCollection();
  return collection.findOne({ _id: assertObjectId(gameId) });
}

async function saveJourneyGameDocument(
  gameId: string,
  game: JourneyGame,
): Promise<JourneyGameResponse | null> {
  const collection = await getJourneyGamesCollection();
  const normalizedGame = normalizeJourneyGame(game);

  if (!normalizedGame) {
    return null;
  }

  const { _id: _ignoredId, id: _ignoredPublicId, ...persistedGame } = normalizedGame as JourneyGame & {
    _id?: ObjectId;
    id?: string;
  };

  const updateResult = await collection.findOneAndUpdate(
    { _id: assertObjectId(gameId) },
    {
      $set: persistedGame,
    },
    {
      returnDocument: "after",
    },
  );

  return updateResult ? serializeJourneyGame(updateResult) : null;
}

export async function createJourneyGameSnapshot(
  payload: CreateJourneyGamePayload,
): Promise<JourneyGameResponse> {
  const nextGame = createJourneyGame(payload.nicknames, {
    rules: payload.rules,
    rulesetId: payload.rulesetId,
    rulesetName: payload.rulesetName,
  });

  const collection = await getJourneyGamesCollection();
  const insertResult = await collection.insertOne(nextGame);
  const createdGame = await collection.findOne({ _id: insertResult.insertedId });

  if (!createdGame) {
    throw new Error("Failed to load created game");
  }

  return serializeJourneyGame(createdGame);
}

export async function getJourneyGameSnapshot(gameId: string): Promise<JourneyGameResponse | null> {
  const game = await getJourneyGameDocumentById(gameId);
  return game ? serializeJourneyGame(game) : null;
}

export async function getLatestJourneyGameSnapshot(
  status?: JourneyGame["status"],
): Promise<JourneyGameResponse | null> {
  const collection = await getJourneyGamesCollection();
  const latestGame = await collection.findOne(
    status ? { status } : {},
    {
      sort: {
        updatedAt: -1,
        createdAt: -1,
      },
    },
  );

  return latestGame ? serializeJourneyGame(latestGame) : null;
}

export async function submitJourneyRound(
  gameId: string,
  payload: SaveJourneyRoundPayload,
): Promise<JourneyGameResponse | null> {
  const currentGame = await getJourneyGameDocumentById(gameId);

  if (!currentGame) {
    return null;
  }

  const nextGame = makeJourneyRound(
    currentGame,
    payload.moves,
    payload.skippedPlayerIds ?? [],
  );

  return saveJourneyGameDocument(gameId, nextGame);
}

export async function removeJourneyPlayerFromSnapshot(
  gameId: string,
  playerId: string,
): Promise<JourneyGameResponse | null> {
  const currentGame = await getJourneyGameDocumentById(gameId);

  if (!currentGame) {
    return null;
  }

  const nextGame = removeJourneyPlayer(currentGame, playerId);
  return saveJourneyGameDocument(gameId, nextGame);
}

export async function replaceJourneyGameSnapshot(
  gameId: string,
  game: JourneyGame,
): Promise<JourneyGameResponse | null> {
  return saveJourneyGameDocument(gameId, game);
}

export async function deleteJourneyGameSnapshot(gameId: string): Promise<boolean> {
  const collection = await getJourneyGamesCollection();
  const deleteResult = await collection.deleteOne({ _id: assertObjectId(gameId) });
  return deleteResult.deletedCount > 0;
}

export function parseJourneyPlayers(text: string, djName = ""): string[] {
  return parsePlayerNamesFromForum(text, djName);
}

export function parseJourneyMoves(text: string): Record<string, number> {
  return parseMovesFromForum(text);
}
