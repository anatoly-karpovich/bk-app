export type UserRole = "admin" | "host";
export interface UserProjectProfile { projectId: string; nickname: string; }
export interface CurrentUser { id: string; login: string; displayName: string; role: UserRole; projectProfiles: UserProjectProfile[]; }
