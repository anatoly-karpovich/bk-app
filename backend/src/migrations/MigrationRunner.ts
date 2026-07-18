import { MigrationsRepository } from "./MigrationsRepository";
import type { MigrationContext, MigrationDefinition, MigrationResult } from "./types";

export interface AppliedMigrationReport {
  id: string;
  description: string;
  summary: MigrationResult["summary"];
}

export interface MigrationRunReport {
  applied: AppliedMigrationReport[];
  pendingBeforeRun: number;
  totalRegistered: number;
}

export class MigrationRunner {
  constructor(
    private readonly repository: MigrationsRepository,
    private readonly migrations: MigrationDefinition[],
  ) {}

  async runPending(context: MigrationContext): Promise<MigrationRunReport> {
    await this.repository.ensureIndexes();

    const appliedIds = await this.repository.findAppliedIds();
    const pendingMigrations = this.migrations.filter((migration) => !appliedIds.has(migration.id));
    const applied: AppliedMigrationReport[] = [];

    for (const migration of pendingMigrations) {
      console.log(`[migration] applying ${migration.id} - ${migration.description}`);
      const result = await migration.run(context);
      await this.repository.markApplied({
        id: migration.id,
        description: migration.description,
        appliedAt: new Date().toISOString(),
      });
      applied.push({
        id: migration.id,
        description: migration.description,
        summary: result?.summary ?? null,
      });
      console.log(`[migration] applied ${migration.id}`);
    }

    return {
      applied,
      pendingBeforeRun: pendingMigrations.length,
      totalRegistered: this.migrations.length,
    };
  }

  async getStatus(): Promise<{
    applied: string[];
    pending: string[];
    totalRegistered: number;
  }> {
    await this.repository.ensureIndexes();

    const appliedIds = await this.repository.findAppliedIds();
    const applied = this.migrations.filter((migration) => appliedIds.has(migration.id)).map((migration) => migration.id);
    const pending = this.migrations.filter((migration) => !appliedIds.has(migration.id)).map((migration) => migration.id);

    return {
      applied,
      pending,
      totalRegistered: this.migrations.length,
    };
  }
}
