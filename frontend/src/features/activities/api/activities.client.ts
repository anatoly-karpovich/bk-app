import { apiClient } from "../../../lib/apiClient";
import { ActivityResultMapper } from "../mappers/ActivityResultMapper";
import type { ActivityResultApiView } from "./activity.views";
import type { ActivityResult, ActivityResultInput, ActivityResultListItem } from "../types";

const mapper = new ActivityResultMapper();

export class ActivitiesApiClient {
  async list(projectId: string): Promise<ActivityResultListItem[]> {
    const activities = await apiClient.get<ActivityResultApiView[]>(this.basePath(projectId));
    return activities.map((activity) => mapper.toListItem(activity));
  }

  async get(projectId: string, activityId: string): Promise<ActivityResult> {
    const activity = await apiClient.get<ActivityResultApiView>(this.activityPath(projectId, activityId));
    return mapper.toResult(activity);
  }

  async create(projectId: string, input: ActivityResultInput): Promise<ActivityResult> {
    const activity = await apiClient.post<ActivityResultApiView>(this.basePath(projectId), input);
    return mapper.toResult(activity);
  }

  async update(projectId: string, activityId: string, input: ActivityResultInput, expectedRevision: number): Promise<ActivityResult> {
    const activity = await apiClient.put<ActivityResultApiView>(this.activityPath(projectId, activityId), { ...input, expectedRevision });
    return mapper.toResult(activity);
  }

  async delete(projectId: string, activityId: string, expectedRevision: number): Promise<void> {
    await apiClient.deleteWithBody(this.activityPath(projectId, activityId), { expectedRevision });
  }

  private basePath(projectId: string): string {
    return `/api/projects/${encodeURIComponent(projectId)}/activities`;
  }

  private activityPath(projectId: string, activityId: string): string {
    return `${this.basePath(projectId)}/${encodeURIComponent(activityId)}`;
  }
}

export const activitiesApiClient = new ActivitiesApiClient();
