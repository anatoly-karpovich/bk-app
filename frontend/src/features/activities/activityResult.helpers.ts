import type { ActivityResult, ActivityResultDraft, ActivityResultInput, ActivityTypeSettings } from "./types";

function participantId(): string {
  return `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createActivityResultDraft(activityTypes: readonly ActivityTypeSettings[]): ActivityResultDraft | null {
  const initialType = activityTypes.find((setting) => setting.enabled);
  if (!initialType) return null;
  return { type: initialType.type, title: initialType.defaultTitle, conductedOn: null, participants: [] };
}

export function emptyActivityParticipant() {
  return {
    id: participantId(),
    nickname: "",
    playerRefId: null,
    rewards: { regular: [], bonus: [] },
  };
}

export function toActivityResultInput(draft: ActivityResultDraft): ActivityResultInput {
  return {
    type: draft.type,
    title: draft.title.trim(),
    conductedOn: draft.conductedOn,
    participants: draft.participants.map(({ id: _id, ...participant }) => ({
      ...participant,
      nickname: participant.nickname.trim(),
      rewards: structuredClone(participant.rewards),
    })),
  };
}

export function getActivityDraftIssues(draft: ActivityResultDraft): string[] {
  const issues: string[] = [];
  if (!draft.type) issues.push("Выберите формат активности.");
  if (!draft.title.trim()) issues.push("Укажите название активности.");
  if (!draft.participants.length) issues.push("Добавьте хотя бы одного получателя награды.");

  const playerKeys = new Set<string>();
  for (const participant of draft.participants) {
    const nickname = participant.nickname.trim();
    if (!nickname) issues.push("Укажите игрока в каждой строке получателей.");
    const playerKey = participant.playerRefId ?? nickname.toLocaleLowerCase("ru");
    if (playerKey) {
      if (playerKeys.has(playerKey)) issues.push("Один игрок может быть указан только один раз.");
      playerKeys.add(playerKey);
    }

    const rewardCount = participant.rewards.regular.length + participant.rewards.bonus.length;
    if (!rewardCount) issues.push("У каждого получателя должна быть хотя бы одна награда.");
    for (const [category, rewards] of Object.entries(participant.rewards) as Array<[
      "regular" | "bonus",
      { resourceId: string; amount: number }[],
    ]>) {
      const resourceIds = new Set<string>();
      for (const reward of rewards) {
        if (!reward.resourceId) issues.push("Выберите ресурс для каждой награды.");
        if (!Number.isFinite(reward.amount) || reward.amount <= 0) issues.push("Сумма награды должна быть больше нуля.");
        if (resourceIds.has(reward.resourceId)) issues.push(`Ресурс не должен повторяться в категории «${category === "regular" ? "Обычные" : "Бонусные"}».`);
        resourceIds.add(reward.resourceId);
      }
    }
  }
  return Array.from(new Set(issues));
}

export function cloneActivityDraft(activity: ActivityResult): ActivityResultDraft {
  return structuredClone(activity.draft);
}

export function isActivityDraftDirty(source: ActivityResult | null, draft: ActivityResultDraft | null): boolean {
  return Boolean(source && draft && JSON.stringify(source.draft) !== JSON.stringify(draft));
}
