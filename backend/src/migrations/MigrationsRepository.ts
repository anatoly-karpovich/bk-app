import type { WithId } from "mongodb";
import type { MongoDatabase } from "../infrastructure/mongo/MongoDatabase";
import type { AppliedMigrationDocument } from "./types";

const MIGRATIONS_COLLECTION = "migrations";

export class MigrationsRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async ensureIndexes(): Promise<void> {
    const collection = await this.getCollection();
    await collection.createIndex({ id: 1 }, { unique: true, name: "migration_id_unique" });
  }

  async findAll(): Promise<Array<WithId<AppliedMigrationDocument>>> {
    const collection = await this.getCollection();
    return collection.find({}).sort({ id: 1 }).toArray();
  }

  async findAppliedIds(): Promise<Set<string>> {
    const migrations = await this.findAll();
    return new Set(migrations.map((migration) => migration.id));
  }

  async markApplied(migration: AppliedMigrationDocument): Promise<void> {
    const collection = await this.getCollection();
    await collection.insertOne(migration);
  }

  private async getCollection() {
    return this.mongoDatabase.getCollection<AppliedMigrationDocument>(MIGRATIONS_COLLECTION);
  }
}
