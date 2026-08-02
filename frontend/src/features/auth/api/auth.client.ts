import { apiClient } from "../../../lib/apiClient";
import type { CurrentUser } from "../types";

export async function getCurrentUserRequest(): Promise<CurrentUser> {
  return (await apiClient.get<{ user: CurrentUser }>("/api/auth/me")).user;
}
export async function loginRequest(input: { login: string; password: string }): Promise<CurrentUser> {
  return (await apiClient.post<{ user: CurrentUser }>("/api/auth/login", input)).user;
}
export async function logoutRequest(): Promise<void> { await apiClient.post<void>("/api/auth/logout"); }
export async function changePasswordRequest(input: { currentPassword: string; newPassword: string }): Promise<void> {
  await apiClient.post<void>("/api/auth/change-password", input);
}

export async function updateOwnProjectNicknameRequest(projectId: string, nickname: string): Promise<CurrentUser> {
  return (
    await apiClient.patch<{ user: CurrentUser }>(`/api/auth/project-profiles/${encodeURIComponent(projectId)}`, { nickname })
  ).user;
}
