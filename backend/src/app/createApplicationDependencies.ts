import { getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
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

export interface ApplicationDependencies {
  configsController: ConfigsController;
  forumTopicController: ForumTopicController;
  journeyController: JourneyController;
}

export function createApplicationDependencies(): ApplicationDependencies {
  const mongoDatabase = getDefaultMongoDatabase();

  const configsRepository = new ConfigsRepository(mongoDatabase);
  const configReadModelFactory = new ConfigReadModelFactory();
  const configsService = new ConfigsService(configsRepository, configReadModelFactory);
  const configsController = new ConfigsController(configsService);

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

  const forumTopicService = new ForumTopicService();
  const forumTopicController = new ForumTopicController(forumTopicService);

  return {
    configsController,
    forumTopicController,
    journeyController,
  };
}
