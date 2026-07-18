import { getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { BattleshipsController } from "../modules/battleships/BattleshipsController";
import { BattleshipsEngine } from "../modules/battleships/BattleshipsEngine";
import { BattleshipsReadModelFactory } from "../modules/battleships/BattleshipsReadModelFactory";
import { BattleshipsRepository } from "../modules/battleships/BattleshipsRepository";
import { BattleshipsService } from "../modules/battleships/BattleshipsService";
import { GameConfigReadModelFactory } from "../modules/gameConfigs/GameConfigReadModelFactory";
import { GameConfigsController } from "../modules/gameConfigs/GameConfigsController";
import { GameConfigsRepository } from "../modules/gameConfigs/GameConfigsRepository";
import { GameConfigsService } from "../modules/gameConfigs/GameConfigsService";
import { ForumTopicController } from "../modules/forumTopic/ForumTopicController";
import { ForumTopicService } from "../modules/forumTopic/ForumTopicService";
import { JourneyController } from "../modules/journey/JourneyController";
import { JourneyEngine } from "../modules/journey/JourneyEngine";
import { JourneyParser } from "../modules/journey/JourneyParser";
import { JourneyReadModelFactory } from "../modules/journey/JourneyReadModelFactory";
import { JourneyRepository } from "../modules/journey/JourneyRepository";
import { JourneyService } from "../modules/journey/JourneyService";
import { LottoController } from "../modules/lotto/LottoController";
import { LottoEngine } from "../modules/lotto/LottoEngine";
import { LottoReadModelFactory } from "../modules/lotto/LottoReadModelFactory";
import { LottoRepository } from "../modules/lotto/LottoRepository";
import { LottoService } from "../modules/lotto/LottoService";
import { ProjectsController } from "../modules/projects/ProjectsController";
import { ProjectsRepository } from "../modules/projects/ProjectsRepository";
import { ProjectsService } from "../modules/projects/ProjectsService";

export interface ApplicationDependencies {
  battleshipsController: BattleshipsController;
  forumTopicController: ForumTopicController;
  gameConfigsController: GameConfigsController;
  journeyController: JourneyController;
  lottoController: LottoController;
  projectsController: ProjectsController;
}

export function createApplicationDependencies(): ApplicationDependencies {
  const mongoDatabase = getDefaultMongoDatabase();

  const projectsRepository = new ProjectsRepository(mongoDatabase);
  const gameConfigsRepository = new GameConfigsRepository(mongoDatabase);
  const battleshipsRepository = new BattleshipsRepository();
  const journeyRepository = new JourneyRepository();
  const lottoRepository = new LottoRepository();
  const projectsService = new ProjectsService(
    projectsRepository,
    gameConfigsRepository,
    journeyRepository,
    battleshipsRepository,
    lottoRepository,
  );
  const projectsController = new ProjectsController(projectsService);

  const gameConfigReadModelFactory = new GameConfigReadModelFactory();
  const gameConfigsService = new GameConfigsService(
    gameConfigsRepository,
    projectsRepository,
    gameConfigReadModelFactory,
  );
  const gameConfigsController = new GameConfigsController(gameConfigsService);

  const battleshipsEngine = new BattleshipsEngine();
  const battleshipsReadModelFactory = new BattleshipsReadModelFactory(battleshipsEngine);
  const battleshipsService = new BattleshipsService(
    battleshipsRepository,
    battleshipsEngine,
    battleshipsReadModelFactory,
    gameConfigsService,
  );
  const battleshipsController = new BattleshipsController(battleshipsService);

  const journeyEngine = new JourneyEngine();
  const journeyReadModelFactory = new JourneyReadModelFactory(journeyEngine);
  const journeyParser = new JourneyParser();
  const journeyService = new JourneyService(
    journeyRepository,
    journeyEngine,
    journeyReadModelFactory,
    journeyParser,
    gameConfigsService,
  );
  const journeyController = new JourneyController(journeyService);

  const lottoEngine = new LottoEngine();
  const lottoReadModelFactory = new LottoReadModelFactory(lottoEngine);
  const lottoService = new LottoService(
    lottoRepository,
    lottoEngine,
    lottoReadModelFactory,
    gameConfigsService,
  );
  const lottoController = new LottoController(lottoService);

  const forumTopicService = new ForumTopicService();
  const forumTopicController = new ForumTopicController(forumTopicService);

  return {
    battleshipsController,
    forumTopicController,
    gameConfigsController,
    journeyController,
    lottoController,
    projectsController,
  };
}
