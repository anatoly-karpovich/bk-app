let environmentLoaded = false;

export function loadEnvironment(): void {
  if (environmentLoaded) {
    return;
  }

  process.loadEnvFile();
  environmentLoaded = true;
}
