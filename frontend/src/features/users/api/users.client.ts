import { apiClient } from "../../../lib/apiClient";
import type { CreateUserInput, ManagedUser, UserMutationInput, UsersListResult } from "../types";

const USERS_API_PATH = "/api/users";

export async function getUsersRequest(query: { search?: string; role?: string; status?: string } = {}): Promise<UsersListResult> {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  if (query.search) params.set("search", query.search);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  return apiClient.get<UsersListResult>(`${USERS_API_PATH}?${params.toString()}`);
}

export async function createUserRequest(input: CreateUserInput): Promise<ManagedUser> {
  return (await apiClient.post<{ user: ManagedUser }>(USERS_API_PATH, input)).user;
}

export async function updateUserRequest(userId: string, input: UserMutationInput): Promise<ManagedUser> {
  return (await apiClient.patch<{ user: ManagedUser }>(`${USERS_API_PATH}/${encodeURIComponent(userId)}`, input)).user;
}

export async function blockUserRequest(userId: string): Promise<void> {
  await apiClient.post<void>(`${USERS_API_PATH}/${encodeURIComponent(userId)}/block`);
}

export async function unblockUserRequest(userId: string): Promise<void> {
  await apiClient.post<void>(`${USERS_API_PATH}/${encodeURIComponent(userId)}/unblock`);
}

export async function resetUserPasswordRequest(userId: string, password: string): Promise<void> {
  await apiClient.post<void>(`${USERS_API_PATH}/${encodeURIComponent(userId)}/reset-password`, { password });
}
