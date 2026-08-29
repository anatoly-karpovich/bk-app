import type { ProjectPlayer } from "../players/types";
import { createActivityParticipantId } from "./activityResult.helpers";
import type { ActivityParticipantDraft, ActivityResourceAmountDraft } from "./types";

export interface RecognizedActivityResult {
  nickname: string;
  regularAmount: number;
  bonusAmount: number | null;
}

export interface ActivityResultsRecognition {
  results: RecognizedActivityResult[];
  ignoredLineNumbers: number[];
}

const resultLinePattern = /^(.+?)\s*(?:[—–-]\s*)?(\d+(?:[.,]\d+)?)(?:\s*\+\s*(\d+(?:[.,]\d+)?))?(?:\s+\D.*)?$/u;

function nicknameKey(nickname: string): string {
  return nickname.trim().toLocaleLowerCase("ru");
}

function parseAmount(value: string): number | null {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/**
 * Parses only a leading nickname followed by a positive regular amount and an
 * optional bonus amount. Remaining non-numeric forum text is intentionally ignored.
 */
export function parseActivityResultsRecognition(text: string): ActivityResultsRecognition {
  const results = new Map<string, RecognizedActivityResult>();
  const ignoredLineNumbers: number[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.replace(/\u00a0/g, " ").trim();
    if (!line) continue;

    const match = resultLinePattern.exec(line);
    const nickname = match?.[1]?.trim();
    const regularAmount = match?.[2] ? parseAmount(match[2]) : null;
    const bonusAmount = match?.[3] ? parseAmount(match[3]) : null;

    if (!nickname || !regularAmount || (match?.[3] && !bonusAmount)) {
      ignoredLineNumbers.push(index + 1);
      continue;
    }

    const key = nicknameKey(nickname);
    results.delete(key);
    results.set(key, { nickname, regularAmount, bonusAmount });
  }

  return { results: Array.from(results.values()), ignoredLineNumbers };
}

function findProjectPlayer(nickname: string, players: readonly ProjectPlayer[]): ProjectPlayer | undefined {
  const key = nicknameKey(nickname);
  return players.find((player) =>
    [player.content.nickname, ...player.content.aliases].some((candidate) => nicknameKey(candidate) === key),
  );
}

function participantKey(participant: ActivityParticipantDraft, players: readonly ProjectPlayer[]): string {
  if (participant.playerRefId) return `ref:${participant.playerRefId}`;
  const projectPlayer = findProjectPlayer(participant.nickname, players);
  return projectPlayer ? `ref:${projectPlayer.id}` : `nickname:${nicknameKey(participant.nickname)}`;
}

function replaceResourceAmount(
  amounts: readonly ActivityResourceAmountDraft[],
  resourceId: string,
  amount: number | null,
): ActivityResourceAmountDraft[] {
  const otherResources = amounts.filter((candidate) => candidate.resourceId !== resourceId).map((candidate) => ({ ...candidate }));
  return amount ? [...otherResources, { resourceId, amount }] : otherResources;
}

function findExistingParticipantKey(
  participants: ReadonlyMap<string, ActivityParticipantDraft>,
  nickname: string,
): string | undefined {
  const key = nicknameKey(nickname);
  return Array.from(participants.entries()).find(([, participant]) => nicknameKey(participant.nickname) === key)?.[0];
}

/**
 * Applies recognized rows in order. The final row for a nickname wins and a
 * selected resource is replaced without removing manually entered other resources.
 */
export function mergeRecognizedActivityParticipants(
  participants: readonly ActivityParticipantDraft[],
  players: readonly ProjectPlayer[],
  resourceId: string,
  recognized: readonly RecognizedActivityResult[],
): ActivityParticipantDraft[] {
  const merged = new Map<string, ActivityParticipantDraft>();
  const setParticipant = (key: string, participant: ActivityParticipantDraft) => {
    merged.delete(key);
    merged.set(key, participant);
  };

  for (const participant of participants) {
    setParticipant(participantKey(participant, players), structuredClone(participant));
  }

  for (const result of recognized) {
    const projectPlayer = findProjectPlayer(result.nickname, players);
    const key = projectPlayer
      ? `ref:${projectPlayer.id}`
      : findExistingParticipantKey(merged, result.nickname) ?? `nickname:${nicknameKey(result.nickname)}`;
    const existing = merged.get(key);
    const nickname = projectPlayer?.content.nickname ?? existing?.nickname ?? result.nickname;
    const playerRefId = projectPlayer?.id ?? existing?.playerRefId ?? null;
    const previousRewards = existing?.rewards ?? { regular: [], bonus: [] };

    setParticipant(key, {
      id: existing?.id ?? createActivityParticipantId(),
      nickname,
      playerRefId,
      rewards: {
        regular: replaceResourceAmount(previousRewards.regular, resourceId, result.regularAmount),
        bonus: replaceResourceAmount(previousRewards.bonus, resourceId, result.bonusAmount),
      },
    });
  }

  return Array.from(merged.values());
}
