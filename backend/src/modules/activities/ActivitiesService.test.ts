import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { CurrentUser } from "../auth/domain/types";
import { ActivitiesService } from "./ActivitiesService";
import { ActivityResultCompletionError, ActivityResultTypeDisabledError } from "./errors";

const actor: CurrentUser = {
  id: "host-1",
  login: "host",
  displayName: "Host",
  role: "admin",
  projectProfiles: [],
};

const project = {
  _id: new ObjectId("66cb0df7c727752c07e779ba"),
  code: "bk",
  name: "BK",
  description: "",
  resources: [
    { id: "coins", code: "coins", name: "Coins", label: "Coins", type: "currency" as const, valueType: "integer" as const, precision: 0 },
    { id: "key", code: "key", name: "Key", label: "Key", type: "item" as const },
  ],
  activityTypes: [
    { type: "lotto" as const, defaultTitle: "Лото", enabled: true },
    { type: "journey" as const, defaultTitle: "Карта", enabled: true },
    { type: "battleships" as const, defaultTitle: "Море", enabled: true },
    { type: "lotto_bingo" as const, defaultTitle: "Бинго", enabled: true },
    { type: "quiz" as const, defaultTitle: "Quiz", enabled: true },
    { type: "memes" as const, defaultTitle: "Memes", enabled: true },
    { type: "forum_quiz" as const, defaultTitle: "Forum", enabled: true },
    { type: "tournament" as const, defaultTitle: "Tournament", enabled: true },
  ],
  createdByUserId: "host-1",
  updatedByUserId: "host-1",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

function createService(options: { disabledLotto?: boolean; activities?: unknown[] } = {}) {
  const activities = options.activities ?? [];
  const submitted: unknown[] = [];
  const selectedProject = { ...project, activityTypes: structuredClone(project.activityTypes) };
  if (options.disabledLotto) selectedProject.activityTypes[0]!.enabled = false;
  const repository = {
    async findByProjectId() { return activities; },
    async findByIdAndProjectId(_id: string, _projectId: string) { return activities[0] ?? null; },
    async create(activity: Record<string, unknown>) {
      const created = { _id: new ObjectId("66cb0df7c727752c07e779bb"), ...activity };
      activities.push(created);
      return created;
    },
    async update(_id: string, _projectId: string, expectedRevision: number, activity: Record<string, unknown>) {
      const updated = { _id: (activities[0] as { _id: ObjectId })._id, ...activity, revision: expectedRevision + 1 };
      activities[0] = updated;
      return updated;
    },
    async delete() { return true; },
  };
  const service = new ActivitiesService(
    repository as never,
    { async findById() { return selectedProject; } } as never,
    {
      async resolveOrCreate(_actor: CurrentUser, _projectId: string, input: { nickname: string; playerRefId?: string | null }) {
        return { nickname: input.nickname.trim(), playerRefId: input.playerRefId ?? `player:${input.nickname}` };
      },
    } as never,
    { async withTransaction<T>(operation: (session: never) => Promise<T>) { return operation(undefined as never); } } as never,
    {
      create(activity: { _id: ObjectId; status: string }) {
        return { id: activity._id.toHexString(), meta: { status: activity.status } };
      },
    } as never,
    { async deleteSourceFact() {}, async deleteProjectFacts() {} },
    { async submitActivityResult(activity: unknown) { submitted.push(activity); } } as never,
  );
  return { service, activities, submitted };
}

const input = {
  type: "lotto" as const,
  title: "Лото 2024",
  conductedOn: "2024-02-05",
  participants: [
    {
      nickname: "Alice",
      rewards: { regular: [{ resourceId: "coins", amount: 10 }], bonus: [{ resourceId: "key", amount: 1 }] },
    },
  ],
};

test("creates a draft from resolved participants and snapshots only used project resources", async () => {
  const { service, activities } = createService();
  const result = await service.create(actor, "66cb0df7c727752c07e779ba", input);
  const saved = activities[0] as { status: string; resourceSnapshot: Array<{ id: string }>; participants: Array<{ playerRefId: string }> };

  assert.equal(result.meta.status, "draft");
  assert.equal(saved.status, "draft");
  assert.deepEqual(saved.resourceSnapshot.map((resource) => resource.id), ["coins", "key"]);
  assert.equal(saved.participants[0]?.playerRefId, "player:Alice");
});

test("rejects creation with a disabled project Activity type", async () => {
  const { service } = createService({ disabledLotto: true });

  await assert.rejects(() => service.create(actor, "66cb0df7c727752c07e779ba", input), ActivityResultTypeDisabledError);
});

test("requires an awarded participant before completing a draft", async () => {
  const { service } = createService({
    activities: [
      {
        _id: new ObjectId("66cb0df7c727752c07e779bb"),
        projectId: "66cb0df7c727752c07e779ba",
        type: "lotto",
        title: "Empty",
        conductedOn: null,
        status: "draft",
        participants: [],
        resourceSnapshot: [],
        hostUserId: "host-1",
        hostSnapshot: { userId: "host-1", displayName: "Host", nickname: "Host" },
        revision: 0,
        completedAt: null,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
        schemaVersion: 1,
      },
    ],
  });

  await assert.rejects(
    () => service.complete(actor, "66cb0df7c727752c07e779ba", "66cb0df7c727752c07e779bb", 0),
    ActivityResultCompletionError,
  );
});

test("re-submits Analytics after an edit to a completed Activity", async () => {
  const { service, activities, submitted } = createService();
  await service.create(actor, "66cb0df7c727752c07e779ba", input);
  const draft = activities[0] as { revision: number };
  await service.complete(actor, "66cb0df7c727752c07e779ba", "66cb0df7c727752c07e779bb", draft.revision);
  const completed = activities[0] as { revision: number };

  await service.update(actor, "66cb0df7c727752c07e779ba", "66cb0df7c727752c07e779bb", {
    ...input,
    title: "Исправленное Лото 2024",
    expectedRevision: completed.revision,
  });

  assert.equal(submitted.length, 2);
});
