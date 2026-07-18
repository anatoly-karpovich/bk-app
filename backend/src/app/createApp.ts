import express from "express";
import { errorMiddleware } from "../common/http/errorMiddleware";
import { createApplicationDependencies } from "./createApplicationDependencies";
import { registerRoutes } from "./registerRoutes";

export function createApp() {
  const app = express();
  const dependencies = createApplicationDependencies();

  app.use(express.json());
  registerRoutes(app, dependencies);
  app.use(errorMiddleware);

  return app;
}
