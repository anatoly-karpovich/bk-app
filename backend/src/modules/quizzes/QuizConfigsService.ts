import { ForbiddenError } from "../../common/errors";
import type { CurrentUser } from "../auth/domain/types";
import { assertOwnedByUser, assertProjectAccess } from "../auth/authorization";
import { ProjectNotFoundError } from "../projects/errors";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import { QuizConfigNotFoundError, QuizConflictError } from "./errors";
import { QuizConfigsRepository } from "./QuizConfigsRepository";
import { validateQuizConfig } from "./domain/validation";
import { publicDocumentFields } from "./domain/publicDocument";
import type { QuizConfigDocument, QuizConfigView, QuizMessageTemplates, QuizRegularRewardRule, QuizRegularRewardOverride, QuizBonusRewardRule } from "./domain/types";

export interface SaveQuizConfigInput {
  name: string;
  description: string;
  questionCount: number | null;
  defaultRegularRule: QuizRegularRewardRule | null;
  regularRewardOverrides: QuizRegularRewardOverride[];
  bonusRules: QuizBonusRewardRule[];
  messageTemplates: QuizMessageTemplates | null;
  answerMessageTemplates: QuizMessageTemplates | null;
  isSystem?: boolean;
}

export class QuizConfigsService {
  constructor(private readonly repository: QuizConfigsRepository, private readonly projectsRepository: ProjectsRepository) {}

  async list(actor: CurrentUser, projectId: string): Promise<QuizConfigView[]> {
    assertProjectAccess(actor, projectId);
    const project = await this.getProject(projectId);
    return (await this.repository.findByProjectId(projectId)).map((config) => this.toView(config._id.toHexString(), config, project.resources));
  }

  async get(actor: CurrentUser, projectId: string, configId: string): Promise<QuizConfigView> {
    assertProjectAccess(actor, projectId);
    const project = await this.getProject(projectId);
    return this.toViewFromId(projectId, configId, project.resources);
  }

  async create(actor: CurrentUser, projectId: string, input: SaveQuizConfigInput): Promise<QuizConfigView> {
    assertProjectAccess(actor, projectId);
    const project = await this.getProject(projectId);
    const name = input.name.trim();
    if (name && await this.repository.findByProjectIdAndName(projectId, name)) throw new QuizConflictError("Конфиг с таким названием уже существует");
    const now = new Date().toISOString();
    const requestedSystem = input.isSystem === true;
    if (requestedSystem && actor.role !== "admin") throw new ForbiddenError("Только администратор может создавать system config");
    const config = this.toDocument(projectId, actor.id, now, input, requestedSystem, actor.id, project.resources);
    const created = await this.repository.create(config);
    if (!created) throw new Error("Failed to load created quiz config");
    return this.toView(created._id.toHexString(), created, project.resources);
  }

  async update(actor: CurrentUser, projectId: string, configId: string, input: SaveQuizConfigInput): Promise<QuizConfigView> {
    assertProjectAccess(actor, projectId);
    const project = await this.getProject(projectId);
    const current = await this.repository.findByIdAndProjectId(configId, projectId);
    if (!current) throw new QuizConfigNotFoundError(configId);
    if (current.isSystem && actor.role !== "admin") throw new ForbiddenError("System config может менять только администратор");
    if (!current.isSystem) assertOwnedByUser(actor, current.createdByUserId);
    const name = input.name.trim();
    if (name && name !== current.name) {
      const duplicate = await this.repository.findByProjectIdAndName(projectId, name);
      if (duplicate && duplicate._id.toHexString() !== configId) throw new QuizConflictError("Конфиг с таким названием уже существует");
    }
    const requestedSystem = actor.role === "admin" ? input.isSystem === true : current.isSystem;
    const updated = await this.repository.update(configId, projectId, this.toDocument(projectId, current.createdByUserId, current.createdAt, input, requestedSystem, actor.id, project.resources));
    if (!updated) throw new QuizConfigNotFoundError(configId);
    return this.toView(updated._id.toHexString(), updated, project.resources);
  }

  async clone(actor: CurrentUser, projectId: string, configId: string): Promise<QuizConfigView> {
    assertProjectAccess(actor, projectId);
    const project = await this.getProject(projectId);
    const source = await this.repository.findByIdAndProjectId(configId, projectId);
    if (!source) throw new QuizConfigNotFoundError(configId);
    const now = new Date().toISOString();
    const name = await this.findCopyName(projectId, source.name);
    const { _id: _ignored, ...sourceDocument } = source;
    const copied = await this.repository.create({ ...structuredClone(sourceDocument), name, isSystem: false, createdByUserId: actor.id, updatedByUserId: actor.id, createdAt: now, updatedAt: now });
    if (!copied) throw new Error("Failed to load cloned quiz config");
    return this.toView(copied._id.toHexString(), copied, project.resources);
  }

  async delete(actor: CurrentUser, projectId: string, configId: string): Promise<void> {
    assertProjectAccess(actor, projectId);
    const current = await this.repository.findByIdAndProjectId(configId, projectId);
    if (!current) throw new QuizConfigNotFoundError(configId);
    if (current.isSystem && actor.role !== "admin") throw new ForbiddenError("System config может удалить только администратор");
    if (!current.isSystem) assertOwnedByUser(actor, current.createdByUserId);
    if (!await this.repository.delete(configId, projectId)) throw new QuizConfigNotFoundError(configId);
  }

  private async toViewFromId(projectId: string, configId: string, resources: Parameters<typeof validateQuizConfig>[1]): Promise<QuizConfigView> {
    const config = await this.repository.findByIdAndProjectId(configId, projectId);
    if (!config) throw new QuizConfigNotFoundError(configId);
    return this.toView(configId, config, resources);
  }

  private toView(id: string, config: QuizConfigDocument, resources: Parameters<typeof validateQuizConfig>[1]): QuizConfigView {
    const validationIssues = validateQuizConfig(config, resources);
    return { id, ...publicDocumentFields(config), status: validationIssues.length ? "draft" : "ready", validationIssues };
  }

  private toDocument(
    projectId: string,
    createdByUserId: string,
    createdAt: string,
    input: SaveQuizConfigInput,
    isSystem: boolean,
    updatedByUserId: string,
    resources: Parameters<typeof validateQuizConfig>[1],
  ): QuizConfigDocument {
    const now = new Date().toISOString();
    const draft: QuizConfigDocument = {
      projectId, name: input.name.trim(), description: input.description.trim(), status: "draft", questionCount: input.questionCount,
      defaultRegularRule: structuredClone(input.defaultRegularRule), regularRewardOverrides: structuredClone(input.regularRewardOverrides), bonusRules: structuredClone(input.bonusRules),
      messageTemplates: structuredClone(input.messageTemplates), answerMessageTemplates: structuredClone(input.answerMessageTemplates), isSystem,
      createdByUserId, updatedByUserId, createdAt, updatedAt: now, schemaVersion: 1,
    };
    draft.status = validateQuizConfig(draft, resources).length ? "draft" : "ready";
    return draft;
  }

  private async getProject(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);
    return project;
  }

  private async findCopyName(projectId: string, name: string): Promise<string> {
    const base = `${name} — Копия`;
    if (!await this.repository.findByProjectIdAndName(projectId, base)) return base;
    let number = 2;
    while (await this.repository.findByProjectIdAndName(projectId, `${base} ${number}`)) number += 1;
    return `${base} ${number}`;
  }
}
