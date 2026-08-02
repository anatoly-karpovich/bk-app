import { existsSync } from "node:fs";
import path from "node:path";

let environmentLoaded = false;

export function loadEnvironment(): void {
  if (environmentLoaded) {
    return;
  }

  const envFile = process.env.BK_APP_ENV_FILE?.trim();
  const resolvedEnvFile = path.resolve(process.cwd(), envFile || ".env");

  if (existsSync(resolvedEnvFile)) {
    process.loadEnvFile(resolvedEnvFile);
  }

  environmentLoaded = true;
}
