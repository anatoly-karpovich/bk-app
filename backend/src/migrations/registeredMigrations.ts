import { migrateProjectsAndGameConfigs } from "./steps/migrateProjectsAndGameConfigs";
import type { MigrationDefinition } from "./types";

export const registeredMigrations: MigrationDefinition[] = [
  {
    id: "2026-07-18-001-split-projects-and-game-configs",
    description: "Split legacy AppConfig into projects and project-owned game configs",
    async run(context) {
      const summary = await migrateProjectsAndGameConfigs(context.mongoDatabase);
      return {
        summary,
      };
    },
  },
];
