import type { Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection, getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { normalizePlayerNickname, toPlayerNicknameKey } from "../modules/players/domain/normalizePlayerNickname";
import { PlayersRepository } from "../modules/players/PlayersRepository";
import type { PlayerAlias } from "../modules/players/domain/types";

const APPLY_ARGUMENT = "--apply";

type GameCollectionName = "journey_games" | "battleships_games" | "lotto_games" | "lotto_bingo_games" | "quizEvents";

interface SourceReport {
  games: number;
  playerReferences: number;
  ignoredPlayerReferences: number;
}

interface PlayerCandidate {
  projectId: string;
  nicknameKey: string;
  nickname: string;
  aliases: Set<string>;
  lastSeenAt: string;
}

interface GameSource {
  collectionName: GameCollectionName;
  extractNicknames(game: Document): string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord).filter((entry): entry is Record<string, unknown> => entry !== null) : [];
}

function stringsFromRecords(records: Record<string, unknown>[], field: string): string[] {
  return records.flatMap((record) => (typeof record[field] === "string" ? [record[field]] : []));
}

function extractJourneyNicknames(game: Document): string[] {
  const stateV2 = asRecord(game.stateV2);
  return stringsFromRecords(asRecords(stateV2?.players), "nickname");
}

function extractBattleshipsNicknames(game: Document): string[] {
  return typeof game.playerName === "string" ? [game.playerName] : [];
}

function extractLottoNicknames(game: Document): string[] {
  return stringsFromRecords(asRecords(game.players), "nickname");
}

function extractLottoBingoNicknames(game: Document): string[] {
  return stringsFromRecords(asRecords(game.players), "nickname");
}

function extractQuizEventNicknames(game: Document): string[] {
  const questions = asRecords(game.questions);
  const fromQuestions = questions.flatMap((question) => [
    ...stringsFromRecords(asRecords(question.selectedAnswers), "playerName"),
    ...stringsFromRecords(asRecords(question.awards), "playerName"),
  ]);
  const summary = asRecord(game.summary);
  return [...fromQuestions, ...stringsFromRecords(asRecords(summary?.players), "playerName")];
}

const GAME_SOURCES: GameSource[] = [
  { collectionName: "journey_games", extractNicknames: extractJourneyNicknames },
  { collectionName: "battleships_games", extractNicknames: extractBattleshipsNicknames },
  { collectionName: "lotto_games", extractNicknames: extractLottoNicknames },
  { collectionName: "lotto_bingo_games", extractNicknames: extractLottoBingoNicknames },
  { collectionName: "quizEvents", extractNicknames: extractQuizEventNicknames },
];

function gameTimestamp(game: Document): string {
  if (typeof game.updatedAt === "string") return game.updatedAt;
  if (typeof game.createdAt === "string") return game.createdAt;
  return "";
}

function collectCandidate(
  candidates: Map<string, PlayerCandidate>,
  projectId: string,
  nicknameInput: string,
  lastSeenAt: string,
): boolean {
  const nickname = normalizePlayerNickname(nicknameInput);
  if (!nickname) return false;

  const nicknameKey = toPlayerNicknameKey(nickname);
  const candidateKey = `${projectId}\u0000${nicknameKey}`;
  const existing = candidates.get(candidateKey);
  if (!existing) {
    candidates.set(candidateKey, {
      projectId,
      nicknameKey,
      nickname,
      aliases: new Set([nickname]),
      lastSeenAt,
    });
    return true;
  }

  existing.aliases.add(nickname);
  if (lastSeenAt > existing.lastSeenAt || (lastSeenAt === existing.lastSeenAt && nickname.localeCompare(existing.nickname, "ru") > 0)) {
    existing.nickname = nickname;
    existing.lastSeenAt = lastSeenAt;
  }
  return true;
}

async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  const playersRepository = new PlayersRepository(getDefaultMongoDatabase());
  const sourceReport = Object.fromEntries(
    GAME_SOURCES.map((source) => [source.collectionName, { games: 0, playerReferences: 0, ignoredPlayerReferences: 0 }]),
  ) as Record<GameCollectionName, SourceReport>;
  const candidates = new Map<string, PlayerCandidate>();

  try {
    for (const source of GAME_SOURCES) {
      const games = await database.collection<Document>(source.collectionName).find({}).toArray();
      const report = sourceReport[source.collectionName];
      report.games = games.length;
      for (const game of games) {
        if (typeof game.projectId !== "string" || !game.projectId) {
          report.ignoredPlayerReferences += source.extractNicknames(game).length;
          continue;
        }
        const nicknames = source.extractNicknames(game);
        report.playerReferences += nicknames.length;
        for (const nickname of nicknames) {
          if (!collectCandidate(candidates, game.projectId, nickname, gameTimestamp(game))) {
            report.ignoredPlayerReferences += 1;
          }
        }
      }
    }

    const orderedCandidates = [...candidates.values()].sort(
      (left, right) => left.projectId.localeCompare(right.projectId) || left.nicknameKey.localeCompare(right.nicknameKey, "ru"),
    );
    const apply = process.argv.includes(APPLY_ARGUMENT);
    let existingPlayers = 0;
    let existingAliasesToAdd = 0;
    let createdPlayers = 0;

    if (!apply) {
      for (const candidate of orderedCandidates) {
        const existing = await playersRepository.findByProjectIdAndAliasKey(candidate.projectId, candidate.nicknameKey);
        if (!existing) continue;
        existingPlayers += 1;
        existingAliasesToAdd += [...candidate.aliases].filter(
          (alias) => !existing.aliases.some((existingAlias) => existingAlias.nickname === alias),
        ).length;
      }
    } else {
      await playersRepository.ensureIndexes();
      const now = new Date().toISOString();
      for (const candidate of orderedCandidates) {
        const result = await playersRepository.upsertFromMigration(
          candidate.projectId,
          candidate.nickname,
          candidate.nicknameKey,
          [...candidate.aliases]
            .sort((left, right) => left.localeCompare(right, "ru"))
            .map<PlayerAlias>((nickname) => ({ nickname, key: toPlayerNicknameKey(nickname) })),
          now,
        );
        if (result.created) createdPlayers += 1;
        else existingPlayers += 1;
      }
    }

    console.log(
      JSON.stringify(
        {
          database: connection.getDatabaseName(),
          sources: sourceReport,
          uniquePlayers: orderedCandidates.length,
          createdPlayers,
          existingPlayers,
          existingAliasesToAdd: apply ? undefined : existingAliasesToAdd,
          applied: apply,
          nextStep: apply ? undefined : `Run again with ${APPLY_ARGUMENT} to create missing players and add exact nickname variants as aliases.`,
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
  console.error("Players migration failed", error);
  process.exit(1);
});
