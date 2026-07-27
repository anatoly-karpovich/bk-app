import { ObjectId, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { Project } from "./domain/types";

const PROJECTS_COLLECTION = "projects";

export interface ProjectDocument extends Project {}

export class ProjectsRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async findAll(): Promise<Array<WithId<ProjectDocument>>> {
    const collection = await this.getCollection();
    return collection.find({}).toArray();
  }

  async findById(projectId: string): Promise<WithId<ProjectDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(projectId) });
  }

  async findByCode(code: string): Promise<WithId<ProjectDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ code });
  }

  async create(project: Project): Promise<WithId<ProjectDocument> | null> {
    const collection = await this.getCollection();
    const result = await collection.insertOne(project);
    return collection.findOne({ _id: result.insertedId });
  }

  async update(projectId: string, project: Project): Promise<WithId<ProjectDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOneAndUpdate(
      { _id: this.toObjectId(projectId) },
      { $set: project },
      { returnDocument: "after" },
    );
  }

  async delete(projectId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: this.toObjectId(projectId) });
    return result.deletedCount > 0;
  }

  private async getCollection() {
    return this.mongoDatabase.getCollection<ProjectDocument>(PROJECTS_COLLECTION);
  }

  private toObjectId(projectId: string): ObjectId {
    return new ObjectId(projectId);
  }
}
