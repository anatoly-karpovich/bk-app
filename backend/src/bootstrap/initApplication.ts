import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";
import { loadEnvironment } from "./loadEnvironment";
import { seedLocalStartDataIfNeeded } from "./seedLocalStartData";
import { seedBootstrapAdminIfNeeded } from "./seedBootstrapAdmin";
import { getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { AuthService } from "../modules/auth/AuthService";
import { PasswordHasher } from "../modules/auth/PasswordHasher";
import { SessionsRepository } from "../modules/auth/SessionsRepository";
import { UsersRepository } from "../modules/auth/UsersRepository";
import { ProjectsRepository } from "../modules/projects/ProjectsRepository";
import { GameConfigsRepository } from "../modules/gameConfigs/GameConfigsRepository";

export interface InitializedApplication {
  mongoConnection: ReturnType<typeof getDefaultMongoConnection>;
}

export async function initApplication(): Promise<InitializedApplication> {
  loadEnvironment();
  const mongoConnection = getDefaultMongoConnection();

  await mongoConnection.connect();
  const client = await mongoConnection.getClient();
  await seedLocalStartDataIfNeeded(client.db(mongoConnection.getDatabaseName()));
  const mongoDatabase = getDefaultMongoDatabase();
  const usersRepository = new UsersRepository(mongoDatabase);
  const sessionsRepository = new SessionsRepository(mongoDatabase);
  const passwordHasher = new PasswordHasher();
  await seedBootstrapAdminIfNeeded(
    new AuthService(usersRepository, sessionsRepository, passwordHasher),
    usersRepository,
    sessionsRepository,
    new ProjectsRepository(mongoDatabase),
    new GameConfigsRepository(mongoDatabase),
  );

  return {
    mongoConnection,
  };
}
