import { getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { BattleshipsController } from "../modules/battleships/BattleshipsController";
import { BattleshipsEngine } from "../modules/battleships/BattleshipsEngine";
import { BattleshipsReadModelFactory } from "../modules/battleships/BattleshipsReadModelFactory";
import { BattleshipsRepository } from "../modules/battleships/BattleshipsRepository";
import { BattleshipsService } from "../modules/battleships/BattleshipsService";
import { ConfigReadModelFactory } from "../modules/configs/ConfigReadModelFactory";
import { ConfigsController } from "../modules/configs/ConfigsController";
import { ConfigsRepository } from "../modules/configs/ConfigsRepository";
import { ConfigsService } from "../modules/configs/ConfigsService";
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

export interface ApplicationDependencies {
  battleshipsController: BattleshipsController;
  configsController: ConfigsController;
  forumTopicController: ForumTopicController;
  journeyController: JourneyController;
  lottoController: LottoController;
}

export function createApplicationDependencies(): ApplicationDependencies {
  const mongoDatabase = getDefaultMongoDatabase();

  const configsRepository = new ConfigsRepository(mongoDatabase);
  const configReadModelFactory = new ConfigReadModelFactory();
  const configsService = new ConfigsService(configsRepository, configReadModelFactory);
  const configsController = new ConfigsController(configsService);

  const battleshipsRepository = new BattleshipsRepository();
  const battleshipsEngine = new BattleshipsEngine();
  const battleshipsReadModelFactory = new BattleshipsReadModelFactory(battleshipsEngine);
  const battleshipsService = new BattleshipsService(
    battleshipsRepository,
    battleshipsEngine,
    battleshipsReadModelFactory,
    configsService,
  );
  const battleshipsController = new BattleshipsController(battleshipsService);

  const journeyRepository = new JourneyRepository();
  const journeyEngine = new JourneyEngine();
  const journeyReadModelFactory = new JourneyReadModelFactory(journeyEngine);
  const journeyParser = new JourneyParser();
  const journeyService = new JourneyService(
    journeyRepository,
    journeyEngine,
    journeyReadModelFactory,
    journeyParser,
    configsService,
  );
  const journeyController = new JourneyController(journeyService);

  const lottoRepository = new LottoRepository();
  const lottoEngine = new LottoEngine();
  const lottoReadModelFactory = new LottoReadModelFactory(lottoEngine);
  const lottoService = new LottoService(lottoRepository, lottoEngine, lottoReadModelFactory, configsService);
  const lottoController = new LottoController(lottoService);

  const forumTopicService = new ForumTopicService();
  const forumTopicController = new ForumTopicController(forumTopicService);

  return {
    battleshipsController,
    configsController,
    forumTopicController,
    journeyController,
    lottoController,
  };
}
