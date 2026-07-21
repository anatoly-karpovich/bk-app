import type { ForumTopicProviderCode } from "./domain/types";

/**
 * Forum capability is deliberately server-side configuration: a project must
 * never be able to provide an arbitrary upstream URL from MongoDB.
 *
 * These are the existing project ids. Once project codes are introduced this
 * map can be migrated to use them without affecting providers or Journey.
 */
const PROVIDER_BY_PROJECT_ID: Readonly<Record<string, ForumTopicProviderCode>> = {
  "6a5ae0c2c65baad6514d42a2": "combats-club",
  "6a5ae0c2c65baad6514d42ad": "darkbk",
};

export function getForumTopicProviderForProject(projectId: string): ForumTopicProviderCode | null {
  return PROVIDER_BY_PROJECT_ID[projectId] ?? null;
}
