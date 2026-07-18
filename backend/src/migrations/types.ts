import type { MongoConnection } from "../infrastructure/mongo/MongoConnection";
import type { MongoDatabase } from "../infrastructure/mongo/MongoDatabase";

export interface MigrationContext {
  mongoConnection: MongoConnection;
  mongoDatabase: MongoDatabase;
}

export interface MigrationResult {
  summary?: Record<string, unknown> | string | null;
}

export interface MigrationDefinition {
  id: string;
  description: string;
  run(context: MigrationContext): Promise<MigrationResult | void>;
}

export interface AppliedMigrationDocument {
  id: string;
  description: string;
  appliedAt: string;
}
