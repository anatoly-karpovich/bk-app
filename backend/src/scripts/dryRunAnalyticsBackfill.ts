import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection, getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { BattleshipsRepository } from "../modules/battleships/BattleshipsRepository";
import { AnalyticsBackfillDryRunService } from "../modules/analytics/AnalyticsBackfillDryRunService";
import { AnalyticsIntegrityService } from "../modules/analytics/AnalyticsIntegrityService";
import { AnalyticsProjectionRepository } from "../modules/analytics/AnalyticsProjectionRepository";
import { AnalyticsProjectionService } from "../modules/analytics/AnalyticsProjectionService";
import { BattleshipsAnalyticsAdapter } from "../modules/analytics/adapters/BattleshipsAnalyticsAdapter";
import { JourneyAnalyticsAdapter } from "../modules/analytics/adapters/JourneyAnalyticsAdapter";
import { LottoAnalyticsAdapter } from "../modules/analytics/adapters/LottoAnalyticsAdapter";
import { LottoBingoAnalyticsAdapter } from "../modules/analytics/adapters/LottoBingoAnalyticsAdapter";
import { QuizEventAnalyticsAdapter } from "../modules/analytics/adapters/QuizEventAnalyticsAdapter";
import { ActivityResultAnalyticsAdapter } from "../modules/analytics/adapters/ActivityResultAnalyticsAdapter";
import { ActivitiesRepository } from "../modules/activities/ActivitiesRepository";
import { AnalyticsProjectionBuildError } from "../modules/analytics/errors/AnalyticsProjectionBuildError";
import { JourneyRepository } from "../modules/journey/JourneyRepository";
import { LottoRepository } from "../modules/lotto/LottoRepository";
import { LottoBingoRepository } from "../modules/lottoBingo/LottoBingoRepository";
import { ProjectsRepository } from "../modules/projects/ProjectsRepository";
import { QuizEventsRepository } from "../modules/quizzes/QuizEventsRepository";

const PROJECT_ID_ARGUMENT = "--project-id=";

function requestedProjectId(): string | null {
  const argument = process.argv.find((value) => value.startsWith(PROJECT_ID_ARGUMENT));
  const projectId = argument?.slice(PROJECT_ID_ARGUMENT.length).trim() ?? "";
  return projectId || null;
}

function createDryRunService(): AnalyticsBackfillDryRunService {
  const mongoDatabase = getDefaultMongoDatabase();
  const projectionRepository = new AnalyticsProjectionRepository(mongoDatabase);
  const adapters = [
    new JourneyAnalyticsAdapter(new JourneyRepository()),
    new BattleshipsAnalyticsAdapter(new BattleshipsRepository()),
    new LottoAnalyticsAdapter(new LottoRepository()),
    new LottoBingoAnalyticsAdapter(new LottoBingoRepository()),
    new QuizEventAnalyticsAdapter(new QuizEventsRepository(mongoDatabase)),
    new ActivityResultAnalyticsAdapter(new ActivitiesRepository(mongoDatabase)),
  ];
  const integrityService = new AnalyticsIntegrityService(projectionRepository, adapters);
  return new AnalyticsBackfillDryRunService(
    new AnalyticsProjectionService(projectionRepository, integrityService, adapters),
  );
}

function projectionBuildErrorReport(error: AnalyticsProjectionBuildError) {
  const details = error.details;
  const sourceType =
    details && typeof details === "object" && "sourceType" in details && typeof details.sourceType === "string"
      ? details.sourceType
      : undefined;
  const sourceId =
    details && typeof details === "object" && "sourceId" in details && typeof details.sourceId === "string"
      ? details.sourceId
      : undefined;
  return { code: error.code, sourceType, sourceId };
}

async function run(): Promise<boolean> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  await connection.connect();
  const client = await connection.getClient();
  const projectIdFilter = requestedProjectId();

  try {
    const projectsRepository = new ProjectsRepository(getDefaultMongoDatabase());
    const projects = await projectsRepository.findAll();
    const selectedProjects = projectIdFilter
      ? projects.filter((project) => project._id.toHexString() === projectIdFilter)
      : projects;
    if (projectIdFilter && selectedProjects.length === 0) throw new Error(`Project ${projectIdFilter} was not found.`);

    const dryRunService = createDryRunService();
    const reports = [];
    for (const project of selectedProjects) {
      const projectId = project._id.toHexString();
      try {
        reports.push({ projectId, status: "ready" as const, report: await dryRunService.inspectProject(projectId) });
      } catch (error) {
        reports.push({
          projectId,
          status: "failed" as const,
          error:
            error instanceof AnalyticsProjectionBuildError
              ? projectionBuildErrorReport(error)
              : { code: "analytics_backfill_dry_run_failed" },
        });
      }
    }

    const failedProjects = reports.filter((entry) => entry.status === "failed").map((entry) => entry.projectId);
    console.log(
      JSON.stringify(
        {
          database: connection.getDatabaseName(),
          mode: "dry_run",
          writesPerformed: false,
          projectsScanned: selectedProjects.length,
          failedProjects,
          reports,
        },
        null,
        2,
      ),
    );
    return failedProjects.length === 0;
  } finally {
    await client.close();
  }
}

run()
  .then((ready) => {
    if (!ready) process.exitCode = 1;
  })
  .catch((error) => {
    console.error("Analytics backfill dry-run failed", error);
    process.exitCode = 1;
  });
