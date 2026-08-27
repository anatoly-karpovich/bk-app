import type { ActivityResultApiView } from "../api/activity.views";
import type { ActivityResult, ActivityResultDraft, ActivityResultListItem, ActivityParticipantDraft } from "../types";

export class ActivityResultMapper {
  toListItem(source: ActivityResultApiView): ActivityResultListItem {
    return {
      id: source.id,
      title: source.content.title,
      type: source.content.type,
      conductedOn: source.content.conductedOn,
      recipientsCount: source.content.participants.length,
      hostNickname: source.meta.host.nickname,
      revision: source.meta.revision,
      access: {
        canUpdate: source.meta.access.canUpdate,
        canDelete: source.meta.access.canDelete,
      },
      updatedAt: source.updatedAt,
    };
  }

  toResult(source: ActivityResultApiView): ActivityResult {
    return {
      id: source.id,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      revision: source.meta.revision,
      hostNickname: source.meta.host.nickname,
      access: source.meta.access,
      draft: this.toDraft(source),
      resources: source.configuration.resources,
    };
  }

  toDraft(source: ActivityResultApiView): ActivityResultDraft {
    return {
      type: source.content.type,
      title: source.content.title,
      conductedOn: source.content.conductedOn,
      participants: source.content.participants.map((participant, index): ActivityParticipantDraft => ({
        id: `saved-${participant.playerRefId}-${index}`,
        nickname: participant.nicknameSnapshot,
        playerRefId: participant.playerRefId,
        rewards: structuredClone(participant.rewards),
      })),
    };
  }
}
