import express from "express";
import { errorMiddleware } from "../common/http/errorMiddleware";
import { corsMiddleware } from "../common/http/corsMiddleware";
import { requireTrustedClient } from "../modules/auth/auth.middleware";
import { createApplicationDependencies } from "./createApplicationDependencies";
import { registerRoutes } from "./registerRoutes";

export function createApp() {
  const app = express();
  const dependencies = createApplicationDependencies();

  app.use(express.json());
  app.use(corsMiddleware);
  app.use("/api", requireTrustedClient);
  registerRoutes(app, dependencies);
  app.use(errorMiddleware);

  return app;
}
