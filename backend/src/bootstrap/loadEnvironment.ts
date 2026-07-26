import path from "node:path";

let environmentLoaded = false;

export function loadEnvironment(): void {
  if (environmentLoaded) {
    return;
  }

  const envFile = process.env.BK_APP_ENV_FILE?.trim();

  if (envFile) {
    process.loadEnvFile(path.resolve(process.cwd(), envFile));
  } else {
    process.loadEnvFile();
  }

  environmentLoaded = true;
}
