import type { WithId } from "mongodb";
import type { CurrentUser } from "../auth/domain/types";
import type { ActivityResultDocument, ActivityResultValidationIssue, ActivityResultView } from "./domain/types";

export class ActivityResultReadModelFactory {
  create(document: WithId<ActivityResultDocument>, actor: CurrentUser): ActivityResultView {
    const manage = actor.role === "admin" || actor.id === document.hostUserId;
    const issues = this.validationIssues(document);
    return {
      id: document._id.toHexString(),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      meta: {
        projectId: document.projectId,
        status: document.status,
        revision: document.revision,
        host: structuredClone(document.hostSnapshot),
        completedAt: document.completedAt,
        access: {
          mode: manage ? "manage" : "read_only",
          canUpdate: manage,
          canComplete: manage && document.status === "draft" && issues.length === 0,
          canDelete: manage,
        },
      },
      content: {
        type: document.type,
        title: document.title,
        conductedOn: document.conductedOn,
        participants: structuredClone(document.participants),
      },
      configuration: { resources: structuredClone(document.resourceSnapshot) },
      validation: { issues },
    };
  }

  private validationIssues(document: ActivityResultDocument): ActivityResultValidationIssue[] {
    return document.participants.length > 0 ? [] : [{ code: "activity_requires_awarded_participant" }];
  }
}
