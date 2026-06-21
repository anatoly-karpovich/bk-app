process.loadEnvFile();

import app from "./app";
import { ensureMongoConnection } from "./lib/mongo";

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  await ensureMongoConnection();

  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
