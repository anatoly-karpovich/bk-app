import type { UserProjectProfile, UserRole } from "../auth/types";

export type UserStatus = "active" | "blocked";

export interface ManagedUser {
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

export interface UsersListResult {
  items: ManagedUser[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UserMutationInput {
  displayName: string;
  role: UserRole;
  projectProfiles: UserProjectProfile[];
}

export interface CreateUserInput extends UserMutationInput {
  login: string;
  password: string;
}
