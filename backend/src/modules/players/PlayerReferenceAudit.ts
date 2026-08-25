import type { Document, ObjectId } from "mongodb";
import { toPlayerNicknameKey } from "./domain/normalizePlayerNickname";

export type PlayerReferenceCollection =
  | "journey_games"
  | "battleships_games"
  | "lotto_games"
  | "lotto_bingo_games"
  | "quizEvents";

export interface PlayerReference {
  playerRefId: string;
  projectId: string;
  collection: PlayerReferenceCollection;
  gameId: string;
  participantId: string;
  nickname: string;
}

export interface MissingPlayerReference {
  projectId: string;
  collection: PlayerReferenceCollection;
  gameId: string;
  participantId: string;
  nickname: string;
  field: "playerRefId";
}

export interface PlayerReferenceAuditSource {
  collection: PlayerReferenceCollection;
  extractReferences(game: Document): PlayerReference[];
  extractMissingReferences(game: Document): MissingPlayerReference[];
}

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

function referencesFromPlayers(
  collection: PlayerReferenceCollection,
  game: Document,
  players: Document[],
): PlayerReference[] {
  const gameId = documentId(game);
  const projectId = string(game.projectId);
  return players.flatMap((player) => {
    const playerRefId = string(player.playerRefId);
    if (!playerRefId) return [];
    return [{ collection, gameId, projectId, participantId: string(player.id), nickname: string(player.nickname), playerRefId }];
  });
}

function missingReferencesFromPlayers(
  collection: PlayerReferenceCollection,
  game: Document,
  players: Document[],
): MissingPlayerReference[] {
  const gameId = documentId(game);
  const projectId = string(game.projectId);
  return players.flatMap((player) => {
    if (string(player.playerRefId)) return [];
    return [
      {
        collection,
        gameId,
        projectId,
        participantId: string(player.id),
        nickname: string(player.nickname),
        field: "playerRefId",
      },
    ];
  });
}

function referencesFromQuiz(game: Document): PlayerReference[] {
  const gameId = documentId(game);
  const projectId = string(game.projectId);
  const questionReferences = asRecords(game.questions).flatMap((question) => [
    ...asRecords(question.selectedAnswers).flatMap((selection) => {
      const playerRefId = string(selection.playerRefId);
      if (!playerRefId) return [];
      return [
        {
          collection: "quizEvents" as const,
          gameId,
          projectId,
          participantId: string(selection.selectedMessageId),
          nickname: string(selection.playerName),
          playerRefId,
        },
      ];
    }),
    ...asRecords(question.awards).flatMap((award) => {
      const playerRefId = string(award.playerRefId);
      if (!playerRefId) return [];
      return [
        {
          collection: "quizEvents" as const,
          gameId,
          projectId,
          participantId: `award:${string(award.id)}`,
          nickname: string(award.playerName),
          playerRefId,
        },
      ];
    }),
  ]);
  const summaryReferences = asRecords(asRecord(game.summary)?.players).flatMap((player) => {
    const playerRefId = string(player.playerRefId);
    if (!playerRefId) return [];
    return [
      {
        collection: "quizEvents" as const,
        gameId,
        projectId,
        participantId: `summary:${toPlayerNicknameKey(string(player.playerName))}`,
        nickname: string(player.playerName),
        playerRefId,
      },
    ];
  });
  return [...questionReferences, ...summaryReferences];
}

function missingReferencesFromQuiz(game: Document): MissingPlayerReference[] {
  const gameId = documentId(game);
  const projectId = string(game.projectId);
  const questionReferences = asRecords(game.questions).flatMap((question) => [
    ...asRecords(question.selectedAnswers).flatMap((selection) => {
      if (string(selection.playerRefId)) return [];
      return [
        {
          collection: "quizEvents" as const,
          gameId,
          projectId,
          participantId: string(selection.selectedMessageId),
          nickname: string(selection.playerName),
          field: "playerRefId" as const,
        },
      ];
    }),
    ...asRecords(question.awards).flatMap((award) => {
      if (string(award.playerRefId)) return [];
      return [
        {
          collection: "quizEvents" as const,
          gameId,
          projectId,
          participantId: `award:${string(award.id)}`,
          nickname: string(award.playerName),
          field: "playerRefId" as const,
        },
      ];
    }),
  ]);
  const summaryReferences = asRecords(asRecord(game.summary)?.players).flatMap((player) => {
    if (string(player.playerRefId)) return [];
    return [
      {
        collection: "quizEvents" as const,
        gameId,
        projectId,
        participantId: `summary:${toPlayerNicknameKey(string(player.playerName))}`,
        nickname: string(player.playerName),
        field: "playerRefId" as const,
      },
    ];
  });
  return [...questionReferences, ...summaryReferences];
}

export const PLAYER_REFERENCE_AUDIT_SOURCES: ReadonlyArray<PlayerReferenceAuditSource> = [
  {
    collection: "journey_games",
    extractReferences: (game) => referencesFromPlayers("journey_games", game, asRecords(asRecord(game.stateV2)?.players)),
    extractMissingReferences: (game) =>
      missingReferencesFromPlayers("journey_games", game, asRecords(asRecord(game.stateV2)?.players)),
  },
  {
    collection: "battleships_games",
    extractReferences: (game) => {
      const playerRefId = string(game.playerRefId);
      return playerRefId
        ? [
            {
              collection: "battleships_games",
              gameId: documentId(game),
              projectId: string(game.projectId),
              participantId: "game-player",
              nickname: string(game.playerName),
              playerRefId,
            },
          ]
        : [];
    },
    extractMissingReferences: (game) => {
      if (string(game.playerRefId)) return [];
      return [
        {
          collection: "battleships_games",
          gameId: documentId(game),
          projectId: string(game.projectId),
          participantId: "game-player",
          nickname: string(game.playerName),
          field: "playerRefId",
        },
      ];
    },
  },
  {
    collection: "lotto_games",
    extractReferences: (game) => referencesFromPlayers("lotto_games", game, asRecords(game.players)),
    extractMissingReferences: (game) => missingReferencesFromPlayers("lotto_games", game, asRecords(game.players)),
  },
  {
    collection: "lotto_bingo_games",
    extractReferences: (game) => referencesFromPlayers("lotto_bingo_games", game, asRecords(game.players)),
    extractMissingReferences: (game) =>
      missingReferencesFromPlayers("lotto_bingo_games", game, asRecords(game.players)),
  },
  {
    collection: "quizEvents",
    extractReferences: referencesFromQuiz,
    extractMissingReferences: missingReferencesFromQuiz,
  },
];
