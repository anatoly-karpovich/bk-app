export type UserRole = "admin" | "host";
export type UserStatus = "active" | "blocked";

export interface UserProjectProfile {
  projectId: string;
  nickname: string;
}

export interface UserDocument {
  login: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  projectProfiles: UserProjectProfile[];
  createdByUserId?: string;
  updatedByUserId?: string;
  passwordChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: 1;
}

export interface SessionDocument {
  tokenHash: string;
  userId: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  passwordChangedAtSnapshot: Date;
  schemaVersion: 1;
}

export interface CurrentUser {
  id: string;
  login: string;
  displayName: string;
  role: UserRole;
  projectProfiles: UserProjectProfile[];
}

export interface HostSnapshot {
  userId: string;
  displayName: string;
  nickname: string;
}
