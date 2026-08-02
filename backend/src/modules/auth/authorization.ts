import { ForbiddenError } from "../../common/errors";
import type { CurrentUser, HostSnapshot } from "./domain/types";

export function assertProjectAccess(user: CurrentUser, projectId: string): void {
  if (user.role === "admin") return;
  if (!user.projectProfiles.some((profile) => profile.projectId === projectId)) {
    throw new ForbiddenError("Project profile is required", { code: "PROJECT_PROFILE_REQUIRED" });
  }
}

export function getHostSnapshot(user: CurrentUser, projectId: string): HostSnapshot {
  assertProjectAccess(user, projectId);
  const profile = user.projectProfiles.find((candidate) => candidate.projectId === projectId);
  if (!profile) throw new ForbiddenError("Project profile is required", { code: "PROJECT_PROFILE_REQUIRED" });
  return { userId: user.id, displayName: user.displayName, nickname: profile.nickname };
}

export function assertOwnedByUser(user: CurrentUser, ownerUserId: string | undefined): void {
  if (user.role === "admin") return;
  if (ownerUserId !== user.id) throw new ForbiddenError("You do not own this resource", { code: "FORBIDDEN" });
}
