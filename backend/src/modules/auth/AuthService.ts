import { createHash, randomBytes } from "node:crypto";
import { ConflictError, ForbiddenError, UnauthorizedError } from "../../common/errors";
import { SESSION_TOUCH_INTERVAL_MS, SESSION_TTL_MS } from "./auth.config";
import type { CurrentUser, SessionDocument, UserDocument } from "./domain/types";
import { PasswordHasher } from "./PasswordHasher";
import { SessionsRepository } from "./SessionsRepository";
import { UsersRepository } from "./UsersRepository";

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;

export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async login(
    loginInput: string,
    password: string,
    metadata: { userAgent?: string; ipAddress?: string },
  ): Promise<{ token: string; user: CurrentUser }> {
    const user = await this.usersRepository.findByLogin(normalizeLogin(loginInput));
    if (!user || user.status !== "active" || !(await this.passwordHasher.verify(user.passwordHash, password))) {
      throw new UnauthorizedError("Invalid credentials", { code: "INVALID_CREDENTIALS" });
    }

    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const session: SessionDocument = {
      tokenHash: hashSessionToken(token),
      userId: user._id.toHexString(),
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      passwordChangedAtSnapshot: user.passwordChangedAt,
      schemaVersion: 1,
    };
    await this.sessionsRepository.create(session);
    return { token, user: toCurrentUser(user) };
  }

  async getCurrentUser(sessionToken: string | undefined): Promise<CurrentUser> {
    if (!sessionToken) throw new UnauthorizedError();
    const tokenHash = hashSessionToken(sessionToken);
    const session = await this.sessionsRepository.findByTokenHash(tokenHash);
    if (!session) throw new UnauthorizedError("Session is invalid", { code: "SESSION_INVALID" });

    const now = new Date();
    if (session.expiresAt <= now) {
      await this.sessionsRepository.deleteById(session._id);
      throw new UnauthorizedError("Session has expired", { code: "SESSION_EXPIRED" });
    }

    const user = await this.usersRepository.findById(session.userId);
    if (!user || user.status !== "active") {
      await this.sessionsRepository.deleteById(session._id);
      throw new UnauthorizedError();
    }

    if (session.passwordChangedAtSnapshot.getTime() !== user.passwordChangedAt.getTime()) {
      await this.sessionsRepository.deleteById(session._id);
      throw new UnauthorizedError("Session is invalid", { code: "SESSION_INVALID" });
    }

    if (now.getTime() - session.lastActivityAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
      await this.sessionsRepository.touch(session._id, now, new Date(now.getTime() + SESSION_TTL_MS));
    }

    return toCurrentUser(user);
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (sessionToken) await this.sessionsRepository.deleteByTokenHash(hashSessionToken(sessionToken));
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user || !(await this.passwordHasher.verify(user.passwordHash, currentPassword))) {
      throw new ForbiddenError("Current password is invalid", { code: "INVALID_CURRENT_PASSWORD" });
    }
    assertValidPassword(newPassword);
    const passwordChangedAt = new Date();
    await this.usersRepository.updateById(userId, {
      passwordHash: await this.passwordHasher.hash(newPassword),
      passwordChangedAt,
      updatedAt: passwordChangedAt,
      updatedByUserId: userId,
    });
    await this.sessionsRepository.deleteByUserId(userId);
  }

  async updateOwnProjectNickname(userId: string, projectId: string, nickname: string): Promise<CurrentUser> {
    const user = await this.usersRepository.findById(userId);
    const trimmedNickname = nickname.trim();
    if (!user || !trimmedNickname || trimmedNickname.length > 80) {
      throw new ConflictError("Invalid project nickname", { code: "USER_INVALID" });
    }
    const profileIndex = user.projectProfiles.findIndex((profile) => profile.projectId === projectId);
    if (profileIndex < 0) throw new ForbiddenError("Project profile is required", { code: "PROJECT_PROFILE_REQUIRED" });
    const projectProfiles = structuredClone(user.projectProfiles);
    projectProfiles[profileIndex] = { projectId, nickname: trimmedNickname };
    const updated = await this.usersRepository.updateById(userId, {
      projectProfiles,
      updatedAt: new Date(),
      updatedByUserId: userId,
    });
    if (!updated) throw new UnauthorizedError();
    return toCurrentUser(updated);
  }

  async createBootstrapAdmin(input: { login: string; displayName: string; password: string }): Promise<CurrentUser> {
    const login = normalizeLogin(input.login);
    assertValidLogin(login);
    assertValidDisplayName(input.displayName);
    assertValidPassword(input.password);
    if (await this.usersRepository.findByLogin(login)) {
      throw new ConflictError("Bootstrap admin login already exists", { code: "USER_LOGIN_CONFLICT" });
    }
    const now = new Date();
    const user = await this.usersRepository.create({
      login,
      displayName: input.displayName.trim(),
      passwordHash: await this.passwordHasher.hash(input.password),
      role: "admin",
      status: "active",
      projectProfiles: [],
      passwordChangedAt: now,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    return toCurrentUser(user);
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function assertValidLogin(login: string): void {
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(login)) {
    throw new ConflictError("Invalid login", { code: "USER_INVALID" });
  }
}

export function assertValidDisplayName(displayName: string): void {
  const value = displayName.trim();
  if (!value || value.length > 80) throw new ConflictError("Invalid display name", { code: "USER_INVALID" });
}

export function assertValidPassword(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new ConflictError("Invalid password", { code: "PASSWORD_INVALID" });
  }
}

export function toCurrentUser(user: { _id: { toHexString(): string } } & UserDocument): CurrentUser {
  return {
    id: user._id.toHexString(),
    login: user.login,
    displayName: user.displayName,
    role: user.role,
    projectProfiles: structuredClone(user.projectProfiles),
  };
}
