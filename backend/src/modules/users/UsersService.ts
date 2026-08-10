import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import { PasswordHasher } from "../auth/PasswordHasher";
import { SessionsRepository } from "../auth/SessionsRepository";
import { assertValidDisplayName, assertValidLogin, assertValidPassword, normalizeLogin } from "../auth/AuthService";
import type { CurrentUser, UserDocument, UserProjectProfile, UserRole, UserStatus } from "../auth/domain/types";
import { UsersRepository } from "../auth/UsersRepository";
import { ProjectsRepository } from "../projects/ProjectsRepository";

export interface UserListItem {
  id: string;
  login: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  projectProfiles: UserProjectProfile[];
  createdByUserId?: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  login: string;
  displayName: string;
  password: string;
  role: UserRole;
  projectProfiles: UserProjectProfile[];
}

export interface UpdateUserInput {
  displayName?: string;
  role?: UserRole;
  projectProfiles?: UserProjectProfile[];
}

export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async listUsers(options: { search?: string; role?: UserRole; status?: UserStatus; page: number; pageSize: number }) {
    const result = await this.usersRepository.list(options);
    return { ...result, items: result.items.map(toUserListItem) };
  }

  async getUser(userId: string): Promise<UserListItem> {
    return toUserListItem(await this.getUserOrThrow(userId));
  }

  async createUser(actor: CurrentUser, input: CreateUserInput): Promise<UserListItem> {
    const login = normalizeLogin(input.login);
    assertValidLogin(login);
    assertValidDisplayName(input.displayName);
    assertValidPassword(input.password);
    await this.assertValidProfiles(input.projectProfiles);
    if (await this.usersRepository.findByLogin(login)) {
      throw new ConflictError("Login is already in use", { code: "USER_LOGIN_CONFLICT" });
    }
    const now = new Date();
    const user = await this.usersRepository.create({
      login,
      displayName: input.displayName.trim(),
      passwordHash: await this.passwordHasher.hash(input.password),
      role: input.role,
      status: "active",
      projectProfiles: normalizeProfiles(input.projectProfiles),
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
      passwordChangedAt: now,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    return toUserListItem(user);
  }

  async updateUser(actor: CurrentUser, userId: string, input: UpdateUserInput): Promise<UserListItem> {
    const current = await this.getUserOrThrow(userId);
    if (input.role && input.role !== current.role) {
      if (actor.id === userId)
        throw new ConflictError("You cannot change your own role", { code: "CANNOT_CHANGE_OWN_ROLE" });
      if (current.role === "admin" && current.status === "active" && input.role === "host")
        await this.assertNotLastActiveAdmin(current);
    }
    if (input.displayName !== undefined) assertValidDisplayName(input.displayName);
    if (input.projectProfiles !== undefined) await this.assertValidProfiles(input.projectProfiles);
    const updated = await this.usersRepository.updateById(userId, {
      ...(input.displayName !== undefined ? { displayName: input.displayName.trim() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.projectProfiles !== undefined ? { projectProfiles: normalizeProfiles(input.projectProfiles) } : {}),
      updatedByUserId: actor.id,
      updatedAt: new Date(),
    });
    if (!updated) throw new NotFoundError("User not found", { code: "USER_NOT_FOUND" });
    return toUserListItem(updated);
  }

  async blockUser(actor: CurrentUser, userId: string): Promise<void> {
    if (actor.id === userId) throw new ConflictError("You cannot block yourself", { code: "CANNOT_BLOCK_SELF" });
    const target = await this.getUserOrThrow(userId);
    if (target.status === "blocked")
      throw new ConflictError("User is already blocked", { code: "USER_ALREADY_BLOCKED" });
    await this.assertNotLastActiveAdmin(target);
    await this.usersRepository.updateById(userId, {
      status: "blocked",
      updatedByUserId: actor.id,
      updatedAt: new Date(),
    });
    await this.sessionsRepository.deleteByUserId(userId);
  }

  async unblockUser(actor: CurrentUser, userId: string): Promise<void> {
    const target = await this.getUserOrThrow(userId);
    if (target.status === "active") throw new ConflictError("User is already active", { code: "USER_ALREADY_ACTIVE" });
    await this.usersRepository.updateById(userId, {
      status: "active",
      updatedByUserId: actor.id,
      updatedAt: new Date(),
    });
  }

  async resetPassword(actor: CurrentUser, userId: string, password: string): Promise<void> {
    assertValidPassword(password);
    await this.getUserOrThrow(userId);
    const now = new Date();
    await this.usersRepository.updateById(userId, {
      passwordHash: await this.passwordHasher.hash(password),
      passwordChangedAt: now,
      updatedAt: now,
      updatedByUserId: actor.id,
    });
    await this.sessionsRepository.deleteByUserId(userId);
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found", { code: "USER_NOT_FOUND" });
    return user;
  }

  private async assertNotLastActiveAdmin(user: { role: UserRole; status: UserStatus }): Promise<void> {
    if (user.role !== "admin" || user.status !== "active") return;
    if ((await this.usersRepository.countDocuments({ role: "admin", status: "active" })) <= 1) {
      throw new ConflictError("The last active administrator cannot be changed", { code: "LAST_ACTIVE_ADMIN" });
    }
  }

  private async assertValidProfiles(profiles: UserProjectProfile[]): Promise<void> {
    if (!profiles.length) throw new ConflictError("At least one project profile is required", { code: "USER_INVALID" });
    const projectIds = new Set<string>();
    for (const profile of profiles) {
      if (
        !profile.projectId ||
        !profile.nickname.trim() ||
        profile.nickname.trim().length > 80 ||
        projectIds.has(profile.projectId)
      ) {
        throw new ConflictError("Invalid project profiles", { code: "USER_INVALID" });
      }
      projectIds.add(profile.projectId);
      if (!(await this.projectsRepository.findById(profile.projectId))) {
        throw new ForbiddenError("Project profile references an unknown project", { code: "USER_INVALID" });
      }
    }
  }
}

function normalizeProfiles(profiles: UserProjectProfile[]): UserProjectProfile[] {
  return profiles.map((profile) => ({ projectId: profile.projectId, nickname: profile.nickname.trim() }));
}

function toUserListItem(user: { _id: { toHexString(): string } } & UserDocument): UserListItem {
  return {
    id: user._id.toHexString(),
    login: user.login,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    projectProfiles: structuredClone(user.projectProfiles),
    createdByUserId: user.createdByUserId,
    updatedByUserId: user.updatedByUserId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
