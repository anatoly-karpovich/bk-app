import type { Document, WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import { createAnalyticsSourceKey, type AnalyticsSourceKind } from "./domain/sourceTypes";
import type { AnalyticsFactDocument } from "./domain/types";

const ANALYTICS_RESULTS_COLLECTION = "analytics_results";

export class AnalyticsProjectionRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async ensureIndexes(): Promise<void> {
    const collection = await this.getCollection();
    await Promise.all([
      collection.createIndex(
        { projectId: 1, "source.kind": 1, "source.id": 1 },
        { unique: true, name: "analytics_project_source_unique" },
      ),
      collection.createIndex(
        { projectId: 1, occurredAt: -1, "source.type": 1 },
        { name: "analytics_project_occurred_at_source_type" },
      ),
    ]);
  }

  async findByProjectId(projectId: string): Promise<Array<WithId<AnalyticsFactDocument>>> {
    return (await this.getCollection()).find({ projectId }).toArray();
  }

  async replaceBySource(fact: AnalyticsFactDocument): Promise<void> {
    await (await this.getCollection()).replaceOne(
      { projectId: fact.projectId, "source.kind": fact.source.kind, "source.id": fact.source.id },
      fact,
      { upsert: true },
    );
  }

  async deleteBySourceKey(projectId: string, kind: AnalyticsSourceKind, sourceId: string): Promise<boolean> {
    const result = await (await this.getCollection()).deleteOne({
      projectId,
      "source.kind": kind,
      "source.id": sourceId,
    });
    return result.deletedCount > 0;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await (await this.getCollection()).deleteMany({ projectId });
  }

  async deleteOrphansForProject(projectId: string, liveSourceKeys: ReadonlySet<string>): Promise<number> {
    const collection = await this.getCollection();
    const existingFacts = await collection
      .find({ projectId }, { projection: { _id: 1, projectId: 1, "source.kind": 1, "source.id": 1 } })
      .toArray();
    const orphanIds = existingFacts
      .filter(
        (fact) =>
          !liveSourceKeys.has(
            createAnalyticsSourceKey({
              projectId: fact.projectId,
              kind: fact.source.kind,
              sourceId: fact.source.id,
            }),
          ),
      )
      .map((fact) => fact._id);

    if (orphanIds.length === 0) return 0;

    const result = await collection.deleteMany({ projectId, _id: { $in: orphanIds } });
    return result.deletedCount;
  }

  async aggregateProject<T extends Document>(projectId: string, pipeline: Document[]): Promise<T[]> {
    return (await this.getCollection()).aggregate<T>([{ $match: { projectId } }, ...pipeline]).toArray();
  }

  private getCollection() {
    return this.mongoDatabase.getCollection<AnalyticsFactDocument>(ANALYTICS_RESULTS_COLLECTION);
  }
}
