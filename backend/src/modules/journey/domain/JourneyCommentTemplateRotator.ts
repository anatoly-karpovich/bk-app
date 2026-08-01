import { JOURNEY_COMMENT_TEMPLATES } from "./commentTemplates";
import type {
  JourneyCommentReference,
  JourneyCommentState,
  JourneyCommentTemplate,
  JourneyCommentTemplateKind,
  JourneyCommentTemplatesSnapshot,
  RandomFn,
} from "./types";

/** Owns the per-game, non-repeating order of Journey forum-comment templates. */
export class JourneyCommentTemplateRotator {
  createState(random: RandomFn = Math.random): JourneyCommentState {
    const snapshot = Object.fromEntries(
      Object.entries(JOURNEY_COMMENT_TEMPLATES).map(([kind, templates]) => [
        kind,
        this.shuffle(
          templates.map((text, index) => ({
            id: this.createTemplateId(kind, index, random),
            text,
          })),
          random,
        ),
      ]),
    ) as JourneyCommentTemplatesSnapshot;

    return { snapshot, lastSelectedIds: {} };
  }

  takeNext(state: JourneyCommentState, kind: JourneyCommentTemplateKind, random: RandomFn = Math.random): JourneyCommentReference {
    const templates = state.snapshot[kind];
    if (!templates.length) throw new Error(`Journey comment templates are not configured for "${kind}"`);

    const lastSelectedId = state.lastSelectedIds[kind];
    const lastSelectedIndex = lastSelectedId ? templates.findIndex((template) => template.id === lastSelectedId) : -1;
    const nextIndex = lastSelectedIndex + 1;
    const template = templates[nextIndex] ?? templates[0];

    if (nextIndex === templates.length - 1) {
      state.snapshot[kind] = this.shuffle(templates, random);
      delete state.lastSelectedIds[kind];
    } else {
      state.lastSelectedIds[kind] = template.id;
    }

    return { kind, templateId: template.id };
  }

  getTemplate(state: JourneyCommentState, reference: JourneyCommentReference): JourneyCommentTemplate {
    const template = state.snapshot[reference.kind]?.find((candidate) => candidate.id === reference.templateId);
    if (!template) throw new Error(`Journey comment template "${reference.templateId}" was not found`);
    return template;
  }

  private shuffle<T>(items: readonly T[], random: RandomFn): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const nextIndex = Math.floor(random() * (index + 1));
      [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
    }
    return result;
  }

  private createTemplateId(kind: string, index: number, random: RandomFn): string {
    return globalThis.crypto?.randomUUID?.() ?? `${kind}-${index}-${Date.now()}-${random()}`;
  }
}
