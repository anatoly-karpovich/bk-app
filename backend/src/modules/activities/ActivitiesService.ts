import type { ClientSession, WithId } from "mongodb";
import { assertOwnedByUser, assertProjectAccess, getHostSnapshot } from "../auth/authorization";
import type { CurrentUser, HostSnapshot } from "../auth/domain/types";
import type { AnalyticsProjectionInvalidator } from "../analytics/AnalyticsProjectionInvalidator";
import type { AnalyticsProjectionSubmitter } from "../analytics/AnalyticsProjectionSubmitter";
import { assertValidResourceAmount, type Resource, type ResourceAmount, type ResourceSnapshot } from "../rewards";
import { normalizeProjectActivityTypes } from "../projects/domain/activityTypes";
import type { Project } from "../projects/domain/types";
import { ProjectNotFoundError } from "../projects/errors";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import { PlayersService } from "../players/PlayersService";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import { ActivityResultReadModelFactory } from "./ActivityResultReadModelFactory";
import { ActivitiesRepository } from "./ActivitiesRepository";
import type { ActivityResultInput } from "./activities.schemas";
import type { ActivityResultDocument, ActivityResultParticipant, ActivityResultView } from "./domain/types";
import {
  ActivityResultAlreadyCompletedError,
  ActivityResultCompletionError,
  ActivityResultNotFoundError,
  ActivityResultRevisionConflictError,
  ActivityResultTypeDisabledError,
  ActivityResultValidationError,
} from "./errors";

type ActivityWithId = WithId<ActivityResultDocument>;

export class ActivitiesService {
  constructor(
    private readonly repository: ActivitiesRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly playersService: PlayersService,
    private readonly mongoDatabase: MongoDatabase,
    private readonly readModels: ActivityResultReadModelFactory,
    private readonly analyticsInvalidator: AnalyticsProjectionInvalidator,
    private readonly analyticsSubmitter: AnalyticsProjectionSubmitter,
  ) {}

  async list(actor: CurrentUser, projectId: string): Promise<ActivityResultView[]> {
    await this.requireProject(actor, projectId);
    return (await this.repository.findByProjectId(projectId)).map((activity) => this.readModels.create(activity, actor));
  }

  async get(actor: CurrentUser, projectId: string, activityId: string): Promise<ActivityResultView> {
    await this.requireProject(actor, projectId);
    return this.readModels.create(await this.requireActivity(projectId, activityId), actor);
  }

  async create(actor: CurrentUser, projectId: string, input: ActivityResultInput): Promise<ActivityResultView> {
    const created = await this.mongoDatabase.withTransaction(async (session) => {
      const project = await this.requireProject(actor, projectId);
      this.assertTypeEnabledForNewActivity(project, input.type);
      const participants = await this.resolveParticipants(actor, project, input.participants, [], session);
      const now = new Date().toISOString();
      const saved = await this.repository.create(
        {
          projectId,
          type: input.type,
          title: input.title,
          conductedOn: input.conductedOn,
          status: "draft",
          participants,
          resourceSnapshot: this.buildResourceSnapshot(participants, project.resources, []),
          hostUserId: actor.id,
          hostSnapshot: this.actorSnapshot(actor, projectId),
          revision: 0,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        session,
      );
      if (!saved) throw new Error("Failed to create Activity Result");
      return saved;
    });

    return this.readModels.create(created, actor);
  }

  async update(
    actor: CurrentUser,
    projectId: string,
    activityId: string,
    input: ActivityResultInput & { expectedRevision: number },
  ): Promise<ActivityResultView> {
    const saved = await this.mongoDatabase.withTransaction(async (session) => {
      const project = await this.requireProject(actor, projectId);
      const current = await this.requireActivity(projectId, activityId, session);
      assertOwnedByUser(actor, current.hostUserId);
      this.assertRevision(current, input.expectedRevision);
      this.assertTypeCanBeUsedForUpdate(project, current, input.type);

      const participants = await this.resolveParticipants(actor, project, input.participants, current.resourceSnapshot, session);
      if (current.status === "completed") this.assertCompleteParticipants(participants);
      const next: ActivityResultDocument = {
        ...current,
        type: input.type,
        title: input.title,
        conductedOn: input.conductedOn,
        participants,
        resourceSnapshot: this.buildResourceSnapshot(participants, project.resources, current.resourceSnapshot),
        updatedAt: new Date().toISOString(),
        revision: current.revision + 1,
      };
      const updated = await this.repository.update(activityId, projectId, input.expectedRevision, next, session);
      if (!updated) throw new ActivityResultRevisionConflictError();
      return updated;
    });

    if (saved.status === "completed") await this.analyticsSubmitter.submitActivityResult(saved);
    return this.readModels.create(saved, actor);
  }

  async complete(
    actor: CurrentUser,
    projectId: string,
    activityId: string,
    expectedRevision: number,
  ): Promise<ActivityResultView> {
    const saved = await this.mongoDatabase.withTransaction(async (session) => {
      await this.requireProject(actor, projectId);
      const current = await this.requireActivity(projectId, activityId, session);
      assertOwnedByUser(actor, current.hostUserId);
      this.assertRevision(current, expectedRevision);
      if (current.status === "completed") throw new ActivityResultAlreadyCompletedError();
      this.assertCompleteParticipants(current.participants);

      const updated = await this.repository.update(
        activityId,
        projectId,
        expectedRevision,
        {
          ...current,
          status: "completed",
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          revision: current.revision + 1,
        },
        session,
      );
      if (!updated) throw new ActivityResultRevisionConflictError();
      return updated;
    });

    await this.analyticsSubmitter.submitActivityResult(saved);
    return this.readModels.create(saved, actor);
  }

  async delete(actor: CurrentUser, projectId: string, activityId: string, expectedRevision: number): Promise<void> {
    await this.requireProject(actor, projectId);
    const current = await this.requireActivity(projectId, activityId);
    assertOwnedByUser(actor, current.hostUserId);
    this.assertRevision(current, expectedRevision);
    if (!(await this.repository.delete(activityId, projectId, expectedRevision))) throw new ActivityResultRevisionConflictError();
    await this.analyticsInvalidator.deleteSourceFact(projectId, { kind: "activity", id: activityId });
  }

  private async requireProject(actor: CurrentUser, projectId: string): Promise<WithId<Project>> {
    assertProjectAccess(actor, projectId);
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);
    return project;
  }

  private async requireActivity(
    projectId: string,
    activityId: string,
    session?: ClientSession,
  ): Promise<ActivityWithId> {
    const activity = await this.repository.findByIdAndProjectId(activityId, projectId, session);
    if (!activity) throw new ActivityResultNotFoundError(projectId, activityId);
    return activity;
  }

  private assertTypeEnabledForNewActivity(project: Project, type: ActivityResultDocument["type"]): void {
    if (!normalizeProjectActivityTypes(project.activityTypes).some((setting) => setting.type === type && setting.enabled)) {
      throw new ActivityResultTypeDisabledError(type);
    }
  }

  private assertTypeCanBeUsedForUpdate(
    project: Project,
    current: ActivityResultDocument,
    nextType: ActivityResultDocument["type"],
  ): void {
    if (nextType !== current.type) this.assertTypeEnabledForNewActivity(project, nextType);
  }

  private async resolveParticipants(
    actor: CurrentUser,
    project: WithId<Project>,
    inputParticipants: ActivityResultInput["participants"],
    historicalResources: ReadonlyArray<ResourceSnapshot>,
    session: ClientSession,
  ): Promise<ActivityResultParticipant[]> {
    const resources = this.resourcesForValidation(project.resources, historicalResources);
    for (const participant of inputParticipants) this.assertParticipantRewards(participant.rewards, resources);

    const participants: ActivityResultParticipant[] = [];
    const playerRefIds = new Set<string>();
    for (const participant of inputParticipants) {
      const identity = await this.playersService.resolveOrCreate(
        actor,
        project._id.toHexString(),
        { nickname: participant.nickname, playerRefId: participant.playerRefId },
        session,
      );
      if (playerRefIds.has(identity.playerRefId)) {
        throw new ActivityResultValidationError(
          `Activity Result cannot contain duplicate player reference: ${identity.playerRefId}`,
        );
      }
      playerRefIds.add(identity.playerRefId);
      participants.push({
        playerRefId: identity.playerRefId,
        nicknameSnapshot: identity.nickname,
        rewards: structuredClone(participant.rewards),
      });
    }
    return participants;
  }

  private assertParticipantRewards(
    rewards: { regular: ResourceAmount[]; bonus: ResourceAmount[] },
    resources: ReadonlyMap<string, Resource>,
  ): void {
    if (rewards.regular.length + rewards.bonus.length === 0) {
      throw new ActivityResultValidationError("Activity Result participant requires at least one reward");
    }
    for (const [category, amounts] of Object.entries(rewards) as Array<["regular" | "bonus", ResourceAmount[]]>) {
      const resourceIds = new Set<string>();
      for (const amount of amounts) {
        if (resourceIds.has(amount.resourceId)) {
          throw new ActivityResultValidationError(
            `Activity Result participant has duplicate ${category} resource: ${amount.resourceId}`,
          );
        }
        resourceIds.add(amount.resourceId);
        if (amount.amount <= 0) {
          throw new ActivityResultValidationError(`Activity Result reward must be positive: ${amount.resourceId}`);
        }
        try {
          assertValidResourceAmount(amount, resources);
        } catch (error) {
          throw new ActivityResultValidationError(
            error instanceof Error ? error.message : "Activity Result reward is invalid",
          );
        }
      }
    }
  }

  private assertCompleteParticipants(participants: ReadonlyArray<ActivityResultParticipant>): void {
    if (participants.length === 0) throw new ActivityResultCompletionError();
  }

  private resourcesForValidation(
    projectResources: ReadonlyArray<Resource>,
    historicalResources: ReadonlyArray<ResourceSnapshot>,
  ): ReadonlyMap<string, Resource> {
    const resources = new Map<string, Resource>();
    for (const resource of historicalResources) resources.set(resource.id, resource);
    for (const resource of projectResources) resources.set(resource.id, resource);
    return resources;
  }

  private buildResourceSnapshot(
    participants: ReadonlyArray<ActivityResultParticipant>,
    projectResources: ReadonlyArray<Resource>,
    historicalResources: ReadonlyArray<ResourceSnapshot>,
  ): ResourceSnapshot[] {
    const usedIds = new Set(
      participants.flatMap((participant) => [...participant.rewards.regular, ...participant.rewards.bonus]).map((amount) => amount.resourceId),
    );
    const resources = this.resourcesForValidation(projectResources, historicalResources);
    return Array.from(usedIds, (resourceId) => {
      const resource = resources.get(resourceId);
      if (!resource) throw new Error(`Unknown project resource \"${resourceId}\"`);
      return structuredClone(resource);
    });
  }

  private assertRevision(current: ActivityResultDocument, expectedRevision: number): void {
    if (current.revision !== expectedRevision) throw new ActivityResultRevisionConflictError();
  }

  private actorSnapshot(actor: CurrentUser, projectId: string): HostSnapshot {
    if (actor.projectProfiles.some((profile) => profile.projectId === projectId)) return getHostSnapshot(actor, projectId);
    assertProjectAccess(actor, projectId);
    return { userId: actor.id, displayName: actor.displayName, nickname: actor.displayName };
  }
}
