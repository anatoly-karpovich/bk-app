import { createApp } from "./app";
import { initApplication } from "./bootstrap/initApplication";
import { loadEnvironment } from "./bootstrap/loadEnvironment";

loadEnvironment();

const PORT = Number(process.env.PORT) || 3002;

function listen(app: ReturnType<typeof createApp>, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Backend listening on port ${port}`);
      resolve();
    });

    server.once("error", reject);
  });
}

async function startServer() {
  await initApplication();
  const app = createApp();
  await listen(app, PORT);
}

startServer().catch((error) => {
  if ((error as NodeJS.ErrnoException)?.code === "EADDRINUSE") {
    console.error(
      `Failed to start backend: port ${PORT} is already in use. Stop the existing process or set PORT to another value.`,
    );
    process.exit(1);
  }

  console.error("Failed to start backend", error);
  process.exit(1);
});
