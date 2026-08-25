import type { Document, ObjectId } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";
import { toPlayerNicknameKey } from "../modules/players/domain/normalizePlayerNickname";
import {
  PLAYER_REFERENCE_AUDIT_SOURCES,
  type PlayerReference,
} from "../modules/players/PlayerReferenceAudit";

function asRecord(value: unknown): Document | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Document) : null;
}

function asRecords(value: unknown): Document[] {
  return Array.isArray(value) ? value.map(asRecord).filter((entry): entry is Document => entry !== null) : [];
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function documentId(document: Document): string {
  return document._id && typeof document._id === "object" && "toHexString" in document._id
    ? (document._id as ObjectId).toHexString()
    : String(document._id ?? "unknown");
}

const GAME_SOURCES = PLAYER_REFERENCE_AUDIT_SOURCES;

const PROJECT_ID_ARGUMENT = "--project-id=";
const QUIZ_DATE_ARGUMENT = "--quiz-date=";

function requestedProjectId(): string | null {
  const argument = process.argv.find((value) => value.startsWith(PROJECT_ID_ARGUMENT));
  const projectId = argument?.slice(PROJECT_ID_ARGUMENT.length).trim() ?? "";
  return projectId || null;
}

function requestedQuizDate(): string | null {
  const argument = process.argv.find((value) => value.startsWith(QUIZ_DATE_ARGUMENT));
  const date = argument?.slice(QUIZ_DATE_ARGUMENT.length).trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

async function run(): Promise<boolean> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  const summaryOnly = process.argv.includes("--summary");
  const strict = process.argv.includes("--strict");
  const projectIdFilter = requestedProjectId();
  const quizDateFilter = requestedQuizDate();

  try {
    const [players, sourceGames] = await Promise.all([
      database.collection<Document>("players").find({}).toArray(),
      Promise.all(
        GAME_SOURCES.map(async (source) => ({
          source,
          games: await database.collection<Document>(source.collection).find({}).toArray(),
        })),
      ),
    ]);
    const referencesByPlayerId = new Map<string, PlayerReference[]>();
    const gamesByCollection = Object.fromEntries(sourceGames.map(({ source, games }) => [source.collection, games.length]));
    const missingPlayerReferences = sourceGames.flatMap(({ source, games }) =>
      games.flatMap((game) => source.extractMissingReferences(game)),
    );

    for (const { source, games } of sourceGames) {
      for (const game of games) {
        for (const reference of source.extractReferences(game)) {
          const entries = referencesByPlayerId.get(reference.playerRefId) ?? [];
          entries.push(reference);
          referencesByPlayerId.set(reference.playerRefId, entries);
        }
      }
    }
    const snapshotParticipantKeys = new Set<string>();
    const addSnapshotNickname = (projectId: string, nickname: string) => {
      const nicknameKey = toPlayerNicknameKey(nickname);
      if (projectId && nicknameKey) snapshotParticipantKeys.add(`${projectId}\u0000${nicknameKey}`);
    };
    for (const { source, games } of sourceGames) {
      for (const game of games) {
        const projectId = string(game.projectId);
        if (source.collection === "journey_games") {
          asRecords(asRecord(game.stateV2)?.players).forEach((player) => addSnapshotNickname(projectId, string(player.nickname)));
        } else if (source.collection === "battleships_games") {
          addSnapshotNickname(projectId, string(game.playerName));
        } else if (source.collection === "quizEvents") {
          for (const question of asRecords(game.questions)) {
            asRecords(question.selectedAnswers).forEach((answer) => addSnapshotNickname(projectId, string(answer.playerName)));
            asRecords(question.awards).forEach((award) => addSnapshotNickname(projectId, string(award.playerName)));
          }
          asRecords(asRecord(game.summary)?.players).forEach((player) => addSnapshotNickname(projectId, string(player.playerName)));
        } else {
          asRecords(game.players).forEach((player) => addSnapshotNickname(projectId, string(player.nickname)));
        }
      }
    }

    const playersById = new Map(players.map((player) => [documentId(player), player]));
    const playersByCurrentNickname = new Map(
      players.map((player) => [
        `${string(player.projectId)}\u0000${string(player.nicknameKey) || toPlayerNicknameKey(string(player.nickname))}`,
        player,
      ]),
    );
    const duplicateGroups = new Map<string, Document[]>();
    for (const player of players) {
      const projectId = string(player.projectId);
      const nickname = string(player.nickname);
      const nicknameKey = string(player.nicknameKey) || toPlayerNicknameKey(nickname);
      if (!projectId || !nicknameKey) continue;
      const key = `${projectId}\u0000${nicknameKey}`;
      const group = duplicateGroups.get(key) ?? [];
      group.push(player);
      duplicateGroups.set(key, group);
    }

    const playerView = (player: Document) => {
      const id = documentId(player);
      return {
        id,
        projectId: string(player.projectId),
        nickname: string(player.nickname),
        nicknameKey: string(player.nicknameKey) || toPlayerNicknameKey(string(player.nickname)),
        createdAt: player.createdAt ?? null,
        updatedAt: player.updatedAt ?? null,
        references: referencesByPlayerId.get(id) ?? [],
      };
    };
    const aliasKey = (player: Document, nicknameKey: string) =>
      asRecords(player.aliases).some((alias) => string(alias.key) === nicknameKey);
    const orphanedReferences = [...referencesByPlayerId.entries()]
      .filter(([playerRefId]) => !playersById.has(playerRefId))
      .map(([playerRefId, references]) => {
        const candidates = references.flatMap((reference) => {
          const nicknameKey = toPlayerNicknameKey(reference.nickname);
          return players
            .filter((player) => string(player.projectId) === reference.projectId)
            .flatMap((player) => {
              const currentMatch = string(player.nicknameKey) === nicknameKey;
              const historicalAliasMatch = aliasKey(player, nicknameKey);
              return currentMatch || historicalAliasMatch
                ? [{ id: documentId(player), nickname: string(player.nickname), match: currentMatch ? "current" : "alias" }]
                : [];
            });
        });
        return {
          playerRefId,
          references,
          candidatePlayers: [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()],
        };
      });
    const duplicateCurrentNicknames = [...duplicateGroups.entries()]
      .flatMap(([key, group]) => {
        if (group.length < 2) return [];
        const [projectId, nicknameKey] = key.split("\u0000");
        return [{ projectId, nicknameKey, players: group.map(playerView) }];
      })
      .sort((left, right) => left.projectId.localeCompare(right.projectId) || left.nicknameKey.localeCompare(right.nicknameKey, "ru"));
    const unresolvedProjectIds = [
      ...new Set(
        [
          ...missingPlayerReferences.map((reference) => reference.projectId),
          ...orphanedReferences.flatMap((reference) => reference.references.map((entry) => entry.projectId)),
        ].filter(Boolean),
      ),
    ].sort();
    const analyticsBackfillReady = missingPlayerReferences.length === 0 && orphanedReferences.length === 0;
    const quizEventParticipants = quizDateFilter
      ? sourceGames
          .find(({ source }) => source.collection === "quizEvents")!
          .games.filter((event) =>
            [string(event.createdAt), string(event.updatedAt)].some((timestamp) => timestamp.startsWith(quizDateFilter)),
          )
          .map((event) => {
            const participants = new Map<string, { nickname: string; playerRefIds: string[] }>();
            const add = (nickname: string, playerRefId = "") => {
              const key = toPlayerNicknameKey(nickname);
              if (!key) return;
              const participant = participants.get(key) ?? { nickname, playerRefIds: [] };
              if (playerRefId && !participant.playerRefIds.includes(playerRefId)) participant.playerRefIds.push(playerRefId);
              participants.set(key, participant);
            };
            for (const question of asRecords(event.questions)) {
              for (const answer of asRecords(question.selectedAnswers)) add(string(answer.playerName), string(answer.playerRefId));
            }
            for (const player of asRecords(asRecord(event.summary)?.players)) add(string(player.playerName));
            const projectId = string(event.projectId);
            return {
              id: documentId(event),
              projectId,
              createdAt: event.createdAt ?? null,
              updatedAt: event.updatedAt ?? null,
              participants: [...participants.entries()]
                .map(([nicknameKey, participant]) => ({
                  ...participant,
                  currentPlayerId: playersByCurrentNickname.get(`${projectId}\u0000${nicknameKey}`)
                    ? documentId(playersByCurrentNickname.get(`${projectId}\u0000${nicknameKey}`)!)
                    : null,
                }))
                .sort((left, right) => left.nickname.localeCompare(right.nickname, "ru")),
            };
          })
      : undefined;
    const quizEventsMeta = sourceGames
      .find(({ source }) => source.collection === "quizEvents")!
      .games.map((event) => ({
        id: documentId(event),
        projectId: string(event.projectId),
        createdAt: event.createdAt ?? null,
        updatedAt: event.updatedAt ?? null,
        selectedAnswersCount: asRecords(event.questions).reduce(
          (total, question) => total + asRecords(question.selectedAnswers).length,
          0,
        ),
      }))
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));

    console.log(
      JSON.stringify(
        {
          database: connection.getDatabaseName(),
          players: players.length,
          gamesByCollection,
          savedGameReferences: [...referencesByPlayerId.values()].reduce((total, references) => total + references.length, 0),
          usedPlayersCount: players.filter((player) => referencesByPlayerId.has(documentId(player))).length,
          playersRepresentedBySnapshotCount: players.filter((player) => {
            const key = `${string(player.projectId)}\u0000${string(player.nicknameKey) || toPlayerNicknameKey(string(player.nickname))}`;
            return snapshotParticipantKeys.has(key);
          }).length,
          usedPlayers: summaryOnly ? undefined : players.map(playerView).filter((player) => player.references.length > 0),
          projectIdFilter,
          quizDateFilter,
          quizEventsMeta,
          quizEventParticipants,
          unusedPlayersInProject: projectIdFilter
            ? players
                .filter((player) => {
                  const key = `${string(player.projectId)}\u0000${string(player.nicknameKey) || toPlayerNicknameKey(string(player.nickname))}`;
                  return (
                    string(player.projectId) === projectIdFilter &&
                    !referencesByPlayerId.has(documentId(player)) &&
                    !snapshotParticipantKeys.has(key)
                  );
                })
                .map((player) => {
                  const view = playerView(player);
                  return { id: view.id, nickname: view.nickname, nicknameKey: view.nicknameKey };
                })
                .sort((left, right) => left.nickname.localeCompare(right.nickname, "ru"))
            : undefined,
          analyticsBackfillPreflight: {
            scope: "all_persisted_game_and_quiz_event_participants",
            strict,
            ready: analyticsBackfillReady,
            unresolvedProjectIds,
            missingPlayerReferenceCount: missingPlayerReferences.length,
            missingPlayerReferences,
            orphanedReferenceGroupCount: orphanedReferences.length,
          },
          orphanedReferences,
          duplicateCurrentNicknames,
        },
        null,
        2,
      ),
    );
    return analyticsBackfillReady;
  } finally {
    await client.close();
  }
}

run()
  .then((analyticsBackfillReady) => {
    if (process.argv.includes("--strict") && !analyticsBackfillReady) process.exitCode = 1;
  })
  .catch((error) => {
    console.error("Player reference audit failed", error);
    process.exitCode = 1;
  });
