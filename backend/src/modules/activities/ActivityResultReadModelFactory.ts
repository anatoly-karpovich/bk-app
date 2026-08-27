import type { WithId } from "mongodb";
import type { CurrentUser } from "../auth/domain/types";
import type { ActivityResultDocument, ActivityResultView } from "./domain/types";

export class ActivityResultReadModelFactory {
  create(document: WithId<ActivityResultDocument>, actor: CurrentUser): ActivityResultView {
    const manage = actor.role === "admin" || actor.id === document.hostUserId;
    return {
      id: document._id.toHexString(),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      meta: {
        projectId: document.projectId,
        revision: document.revision,
        host: structuredClone(document.hostSnapshot),
        access: {
          mode: manage ? "manage" : "read_only",
          canUpdate: manage,
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
    };
  }
}
