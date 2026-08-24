import type { Document, ObjectId } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection, getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { toPlayerNicknameKey } from "../modules/players/domain/normalizePlayerNickname";
import { PlayersRepository } from "../modules/players/PlayersRepository";

const APPLY_ARGUMENT = "--apply";
const QUIZ_EVENTS_COLLECTION = "quizEvents";

type ReferenceLocation = "selected_answer" | "award" | "summary";
type UnresolvedReason =
  | "missing_project_id"
  | "empty_player_name"
  | "player_not_found"
  | "award_without_resolved_selection"
  | "summary_without_resolved_selection"
  | "ambiguous_summary_player";

interface UnresolvedPlayerReference {
  eventId: string;
  questionId: string | null;
  location: ReferenceLocation;
  playerName: string;
  selectedMessageId: string | null;
  reason: UnresolvedReason;
}

interface ConflictingPlayerReference {
  eventId: string;
  questionId: string | null;
  location: ReferenceLocation;
  playerName: string;
  selectedMessageId: string | null;
  existingPlayerRefId: string;
  resolvedPlayerRefId: string;
}

interface EventUpdate {
  id: ObjectId;
  projectId: string;
  revision: number;
  questions: Document[];
  summary: Document | null;
}

interface ReferenceCounts {
  selectedAnswers: number;
  awards: number;
  summaryPlayers: number;
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

function existingPlayerRefId(record: Document): string | null {
  return string(record.playerRefId) || null;
}

async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  const playersRepository = new PlayersRepository(getDefaultMongoDatabase());
  const apply = process.argv.includes(APPLY_ARGUMENT);

  try {
    const events = await database.collection<Document>(QUIZ_EVENTS_COLLECTION).find({}).toArray();
    const unresolved: UnresolvedPlayerReference[] = [];
    const conflicts: ConflictingPlayerReference[] = [];
    const updates: EventUpdate[] = [];
    const referencesToAdd: ReferenceCounts = { selectedAnswers: 0, awards: 0, summaryPlayers: 0 };
    let alreadyLinked = 0;

    for (const event of events) {
      const eventId = documentId(event);
      const projectId = string(event.projectId);
      const questions = asRecords(event.questions);
      const summary = asRecord(event.summary);
      const resolvedByNickname = new Map<string, string | null>();
      const resolvedByMessageId = new Map<string, string>();
      let changed = false;

      const resolvePlayer = async (
        location: ReferenceLocation,
        questionId: string | null,
        playerName: string,
        selectedMessageId: string | null,
      ): Promise<string | null> => {
        if (!projectId) {
          unresolved.push({ eventId, questionId, location, playerName, selectedMessageId, reason: "missing_project_id" });
          return null;
        }
        const nicknameKey = toPlayerNicknameKey(playerName);
        if (!nicknameKey) {
          unresolved.push({ eventId, questionId, location, playerName, selectedMessageId, reason: "empty_player_name" });
          return null;
        }
        const cacheKey = `${projectId}\u0000${nicknameKey}`;
        if (!resolvedByNickname.has(cacheKey)) {
          const player = await playersRepository.findByProjectIdAndNicknameKey(projectId, nicknameKey);
          resolvedByNickname.set(cacheKey, player ? player._id.toHexString() : null);
        }
        const playerRefId = resolvedByNickname.get(cacheKey) ?? null;
        if (!playerRefId) {
          unresolved.push({ eventId, questionId, location, playerName, selectedMessageId, reason: "player_not_found" });
        }
        return playerRefId;
      };

      const nextQuestions = await Promise.all(
        questions.map(async (question) => {
          const questionId = string(question.id) || null;
          const nextSelections = await Promise.all(
            asRecords(question.selectedAnswers).map(async (selection) => {
              const playerName = string(selection.playerName);
              const selectedMessageId = string(selection.selectedMessageId) || null;
              const resolvedPlayerRefId = await resolvePlayer("selected_answer", questionId, playerName, selectedMessageId);
              const existingRef = existingPlayerRefId(selection);
              if (!resolvedPlayerRefId) return selection;
              if (existingRef === resolvedPlayerRefId) {
                alreadyLinked += 1;
              } else if (existingRef) {
                conflicts.push({
                  eventId,
                  questionId,
                  location: "selected_answer",
                  playerName,
                  selectedMessageId,
                  existingPlayerRefId: existingRef,
                  resolvedPlayerRefId,
                });
              } else {
                changed = true;
                referencesToAdd.selectedAnswers += 1;
              }
              if (selectedMessageId && !existingRef) resolvedByMessageId.set(selectedMessageId, resolvedPlayerRefId);
              if (selectedMessageId && existingRef === resolvedPlayerRefId) resolvedByMessageId.set(selectedMessageId, resolvedPlayerRefId);
              return existingRef ? selection : { ...selection, playerRefId: resolvedPlayerRefId };
            }),
          );

          const nextAwards = asRecords(question.awards).map((award) => {
            const playerName = string(award.playerName);
            const selectedMessageId = string(award.selectedMessageId) || null;
            const resolvedPlayerRefId = selectedMessageId ? resolvedByMessageId.get(selectedMessageId) ?? null : null;
            const existingRef = existingPlayerRefId(award);
            if (!resolvedPlayerRefId) {
              unresolved.push({
                eventId,
                questionId,
                location: "award",
                playerName,
                selectedMessageId,
                reason: "award_without_resolved_selection",
              });
              return award;
            }
            if (existingRef === resolvedPlayerRefId) {
              alreadyLinked += 1;
              return award;
            }
            if (existingRef) {
              conflicts.push({
                eventId,
                questionId,
                location: "award",
                playerName,
                selectedMessageId,
                existingPlayerRefId: existingRef,
                resolvedPlayerRefId,
              });
              return award;
            }
            changed = true;
            referencesToAdd.awards += 1;
            return { ...award, playerRefId: resolvedPlayerRefId };
          });
          return { ...question, selectedAnswers: nextSelections, awards: nextAwards };
        }),
      );

      const resolvedRefsByPlayerName = new Map<string, Set<string>>();
      for (const question of nextQuestions) {
        for (const selection of asRecords(question.selectedAnswers)) {
          const selectedMessageId = string(selection.selectedMessageId);
          const playerRefId = resolvedByMessageId.get(selectedMessageId);
          const playerName = string(selection.playerName);
          if (!playerRefId || !playerName) continue;
          const references = resolvedRefsByPlayerName.get(playerName) ?? new Set<string>();
          references.add(playerRefId);
          resolvedRefsByPlayerName.set(playerName, references);
        }
      }

      const nextSummary = summary
        ? {
            ...summary,
            players: asRecords(summary.players).map((player) => {
              const playerName = string(player.playerName);
              const references = resolvedRefsByPlayerName.get(playerName) ?? new Set<string>();
              const existingRef = existingPlayerRefId(player);
              if (references.size === 0) {
                unresolved.push({
                  eventId,
                  questionId: null,
                  location: "summary",
                  playerName,
                  selectedMessageId: null,
                  reason: "summary_without_resolved_selection",
                });
                return player;
              }
              if (references.size > 1) {
                unresolved.push({
                  eventId,
                  questionId: null,
                  location: "summary",
                  playerName,
                  selectedMessageId: null,
                  reason: "ambiguous_summary_player",
                });
                return player;
              }
              const [resolvedPlayerRefId] = references;
              if (existingRef === resolvedPlayerRefId) {
                alreadyLinked += 1;
                return player;
              }
              if (existingRef) {
                conflicts.push({
                  eventId,
                  questionId: null,
                  location: "summary",
                  playerName,
                  selectedMessageId: null,
                  existingPlayerRefId: existingRef,
                  resolvedPlayerRefId,
                });
                return player;
              }
              changed = true;
              referencesToAdd.summaryPlayers += 1;
              return { ...player, playerRefId: resolvedPlayerRefId };
            }),
          }
        : null;

      if (!changed) continue;
      const revision = typeof event.revision === "number" && Number.isInteger(event.revision) && event.revision >= 0
        ? event.revision
        : null;
      if (revision === null || !projectId || !event._id) {
        conflicts.push({
          eventId,
          questionId: null,
          location: "summary",
          playerName: "",
          selectedMessageId: null,
          existingPlayerRefId: revision === null ? "invalid_or_missing_revision" : "missing_project_id",
          resolvedPlayerRefId: "not_updated",
        });
        continue;
      }
      updates.push({ id: event._id as ObjectId, projectId, revision, questions: nextQuestions, summary: nextSummary });
    }

    const report = {
      database: connection.getDatabaseName(),
      eventsScanned: events.length,
      eventsToUpdate: updates.length,
      playerReferencesToAdd: referencesToAdd,
      alreadyLinked,
      unresolved,
      conflicts,
      applied: false,
    };
    if (!apply) {
      console.log(JSON.stringify({ ...report, nextStep: `Run again with ${APPLY_ARGUMENT} after resolving conflicts.` }, null, 2));
      return;
    }
    if (conflicts.length) {
      console.log(JSON.stringify(report, null, 2));
      throw new Error("Refusing Quiz Event player-reference migration because conflicting references were found.");
    }

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const updatedAt = new Date().toISOString();
        for (const update of updates) {
          const result = await database.collection<Document>(QUIZ_EVENTS_COLLECTION).updateOne(
            { _id: update.id, projectId: update.projectId, revision: update.revision },
            { $set: { questions: update.questions, summary: update.summary, updatedAt }, $inc: { revision: 1 } },
            { session },
          );
          if (result.modifiedCount !== 1) {
            throw new Error(`Quiz Event ${update.id.toHexString()} changed during player-reference migration.`);
          }
        }
      });
    } finally {
      await session.endSession();
    }
    console.log(JSON.stringify({ ...report, applied: true, modifiedEvents: updates.length }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Quiz Event player-reference migration failed", error);
  process.exit(1);
});
