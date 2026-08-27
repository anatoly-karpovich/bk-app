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
import { QuizConfigsRepository } from "../modules/quizzes/QuizConfigsRepository";
import { QuizzesRepository } from "../modules/quizzes/QuizzesRepository";
import { QuizEventsRepository } from "../modules/quizzes/QuizEventsRepository";
import { PlayersRepository } from "../modules/players/PlayersRepository";
import { AnalyticsProjectionRepository } from "../modules/analytics/AnalyticsProjectionRepository";
import { ActivitiesRepository } from "../modules/activities/ActivitiesRepository";

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
  const quizConfigsRepository = new QuizConfigsRepository(mongoDatabase);
  const quizzesRepository = new QuizzesRepository(mongoDatabase);
  const quizEventsRepository = new QuizEventsRepository(mongoDatabase);
  const playersRepository = new PlayersRepository(mongoDatabase);
  const analyticsProjectionRepository = new AnalyticsProjectionRepository(mongoDatabase);
  const activitiesRepository = new ActivitiesRepository(mongoDatabase);
  await Promise.all([
    usersRepository.ensureIndexes(),
    sessionsRepository.ensureIndexes(),
    quizConfigsRepository.ensureIndexes(),
    quizzesRepository.ensureIndexes(),
    quizEventsRepository.ensureIndexes(),
    playersRepository.ensureIndexes(),
    analyticsProjectionRepository.ensureIndexes(),
    activitiesRepository.ensureIndexes(),
  ]);
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
