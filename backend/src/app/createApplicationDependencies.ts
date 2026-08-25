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
import { JourneyV2Engine } from "../modules/journey/JourneyV2Engine";
import { JourneyCommentTemplateRotator } from "../modules/journey/domain/JourneyCommentTemplateRotator";
import { JourneyResourceInventoryService } from "../modules/journey/domain/JourneyResourceInventoryService";
import { JourneyRewardCommentFormatter } from "../modules/journey/domain/JourneyRewardCommentFormatter";
import { JourneyParser } from "../modules/journey/JourneyParser";
import { JourneyReadModelFactory } from "../modules/journey/JourneyReadModelFactory";
import { JourneyForumStateFormatter } from "../modules/journey/JourneyForumStateFormatter";
import { JourneyForumMovesImporter } from "../modules/journey/JourneyForumMovesImporter";
import { JourneyForumPlayersImporter } from "../modules/journey/JourneyForumPlayersImporter";
import { JourneyRepository } from "../modules/journey/JourneyRepository";
import { JourneyService } from "../modules/journey/JourneyService";
import { CryptoRandomizer, LoggingRandomizer, RewardGrantService } from "../modules/rewards";
import { LottoController } from "../modules/lotto/LottoController";
import { LottoEngine } from "../modules/lotto/LottoEngine";
import { LottoPayoutDistributor } from "../modules/lotto/domain/LottoPayoutDistributor";
import { LottoReadModelFactory } from "../modules/lotto/LottoReadModelFactory";
import { LottoRepository } from "../modules/lotto/LottoRepository";
import { LottoService } from "../modules/lotto/LottoService";
import { LottoBingoController } from "../modules/lottoBingo/LottoBingoController";
import { LottoBingoEngine } from "../modules/lottoBingo/LottoBingoEngine";
import { LottoBingoReadModelFactory } from "../modules/lottoBingo/LottoBingoReadModelFactory";
import { LottoBingoRepository } from "../modules/lottoBingo/LottoBingoRepository";
import { LottoBingoService } from "../modules/lottoBingo/LottoBingoService";
import { LottoBingoUpdatePublisher } from "../modules/lottoBingo/LottoBingoUpdatePublisher";
import { LottoBingoTicketGenerator } from "../modules/lottoBingo/domain/LottoBingoTicketGenerator";
import { ProjectsController } from "../modules/projects/ProjectsController";
import { ProjectsRepository } from "../modules/projects/ProjectsRepository";
import { ProjectsService } from "../modules/projects/ProjectsService";
import { PlayersController } from "../modules/players/PlayersController";
import { PlayerReadModelFactory } from "../modules/players/PlayerReadModelFactory";
import { PlayerReferencesRepository } from "../modules/players/PlayerReferencesRepository";
import { PlayersRepository } from "../modules/players/PlayersRepository";
import { PlayersService } from "../modules/players/PlayersService";
import { AuthController } from "../modules/auth/AuthController";
import { AuthService } from "../modules/auth/AuthService";
import { PasswordHasher } from "../modules/auth/PasswordHasher";
import { SessionsRepository } from "../modules/auth/SessionsRepository";
import { UsersRepository } from "../modules/auth/UsersRepository";
import { UsersController } from "../modules/users/UsersController";
import { UsersService } from "../modules/users/UsersService";
import { QuizConfigsRepository } from "../modules/quizzes/QuizConfigsRepository";
import { QuizConfigsService } from "../modules/quizzes/QuizConfigsService";
import { QuizConfigsController } from "../modules/quizzes/QuizConfigsController";
import { QuizConfigReadModelFactory } from "../modules/quizzes/QuizConfigReadModelFactory";
import { QuizzesRepository } from "../modules/quizzes/QuizzesRepository";
import { QuizzesService } from "../modules/quizzes/QuizzesService";
import { QuizzesController } from "../modules/quizzes/QuizzesController";
import { QuizReadModelFactory } from "../modules/quizzes/QuizReadModelFactory";
import { QuizEventsRepository } from "../modules/quizzes/QuizEventsRepository";
import { QuizEventEngine } from "../modules/quizzes/QuizEventEngine/QuizEventEngine";
import { ChatParser } from "../modules/chat/ChatParser";
import { ChatMessageIdentity } from "../modules/chat/ChatMessageIdentity";
import { QuizAnswerRanker } from "../modules/quizzes/QuizAnswerRanker/QuizAnswerRanker";
import { QuizAwardCalculator } from "../modules/quizzes/QuizAwardCalculator/QuizAwardCalculator";
import { QuizEventSummaryCalculator } from "../modules/quizzes/QuizEventSummaryCalculator/QuizEventSummaryCalculator";
import { QuizSelectedAnswerPruner } from "../modules/quizzes/QuizSelectedAnswerPruner/QuizSelectedAnswerPruner";
import { QuizMessageCandidateFilter } from "../modules/quizzes/QuizMessageCandidateFilter/QuizMessageCandidateFilter";
import { QuizEventReadModelFactory } from "../modules/quizzes/QuizEventReadModelFactory";
import { QuizEventsService } from "../modules/quizzes/QuizEventsService/QuizEventsService";
import { QuizEventsController } from "../modules/quizzes/QuizEventsController";
import { AnalyticsController } from "../modules/analytics/AnalyticsController";
import { AnalyticsIntegrityService } from "../modules/analytics/AnalyticsIntegrityService";
import { AnalyticsProjectionRepository } from "../modules/analytics/AnalyticsProjectionRepository";
import { AnalyticsProjectionService } from "../modules/analytics/AnalyticsProjectionService";
import { BestEffortAnalyticsProjectionInvalidator } from "../modules/analytics/AnalyticsProjectionInvalidator";
import { BestEffortAnalyticsProjectionSubmitter } from "../modules/analytics/AnalyticsProjectionSubmitter";
import { AnalyticsReadModelFactory } from "../modules/analytics/AnalyticsReadModelFactory";
import { AnalyticsReadService } from "../modules/analytics/AnalyticsReadService";
import { AnalyticsService } from "../modules/analytics/AnalyticsService";
import { BattleshipsAnalyticsAdapter } from "../modules/analytics/adapters/BattleshipsAnalyticsAdapter";
import { JourneyAnalyticsAdapter } from "../modules/analytics/adapters/JourneyAnalyticsAdapter";
import { LottoAnalyticsAdapter } from "../modules/analytics/adapters/LottoAnalyticsAdapter";
import { LottoBingoAnalyticsAdapter } from "../modules/analytics/adapters/LottoBingoAnalyticsAdapter";
import { QuizEventAnalyticsAdapter } from "../modules/analytics/adapters/QuizEventAnalyticsAdapter";

export interface ApplicationDependencies {
  analyticsController: AnalyticsController;
  authController: AuthController;
  authService: AuthService;
  battleshipsController: BattleshipsController;
  forumTopicController: ForumTopicController;
  gameConfigsController: GameConfigsController;
  journeyController: JourneyController;
  lottoController: LottoController;
  lottoBingoController: LottoBingoController;
  projectsController: ProjectsController;
  playersController: PlayersController;
  quizConfigsController: QuizConfigsController;
  quizzesController: QuizzesController;
  quizEventsController: QuizEventsController;
  usersController: UsersController;
}

export function createApplicationDependencies(): ApplicationDependencies {
  const mongoDatabase = getDefaultMongoDatabase();

  const usersRepository = new UsersRepository(mongoDatabase);
  const sessionsRepository = new SessionsRepository(mongoDatabase);
  const passwordHasher = new PasswordHasher();
  const authService = new AuthService(usersRepository, sessionsRepository, passwordHasher);
  const authController = new AuthController(authService);

  const projectsRepository = new ProjectsRepository(mongoDatabase);
  const playersRepository = new PlayersRepository(mongoDatabase);
  const playersService = new PlayersService(
    playersRepository,
    projectsRepository,
    new PlayerReadModelFactory(),
    new PlayerReferencesRepository(mongoDatabase),
  );
  const quizConfigsRepository = new QuizConfigsRepository(mongoDatabase);
  const quizzesRepository = new QuizzesRepository(mongoDatabase);
  const quizEventsRepository = new QuizEventsRepository(mongoDatabase);
  const gameConfigsRepository = new GameConfigsRepository(mongoDatabase);
  const battleshipsRepository = new BattleshipsRepository();
  const journeyRepository = new JourneyRepository();
  const lottoRepository = new LottoRepository();
  const lottoBingoRepository = new LottoBingoRepository();
  const analyticsProjectionRepository = new AnalyticsProjectionRepository(mongoDatabase);
  const analyticsInvalidator = new BestEffortAnalyticsProjectionInvalidator(analyticsProjectionRepository);
  const journeyAnalyticsAdapter = new JourneyAnalyticsAdapter(journeyRepository);
  const battleshipsAnalyticsAdapter = new BattleshipsAnalyticsAdapter(battleshipsRepository);
  const lottoAnalyticsAdapter = new LottoAnalyticsAdapter(lottoRepository);
  const lottoBingoAnalyticsAdapter = new LottoBingoAnalyticsAdapter(lottoBingoRepository);
  const quizEventAnalyticsAdapter = new QuizEventAnalyticsAdapter(quizEventsRepository);
  const analyticsAdapters = [
    journeyAnalyticsAdapter,
    battleshipsAnalyticsAdapter,
    lottoAnalyticsAdapter,
    lottoBingoAnalyticsAdapter,
    quizEventAnalyticsAdapter,
  ];
  const analyticsIntegrityService = new AnalyticsIntegrityService(analyticsProjectionRepository, analyticsAdapters);
  const analyticsProjectionService = new AnalyticsProjectionService(
    analyticsProjectionRepository,
    analyticsIntegrityService,
    analyticsAdapters,
  );
  const analyticsSubmitter = new BestEffortAnalyticsProjectionSubmitter(analyticsProjectionService, {
    journey: journeyAnalyticsAdapter,
    battleships: battleshipsAnalyticsAdapter,
    lotto: lottoAnalyticsAdapter,
    lottoBingo: lottoBingoAnalyticsAdapter,
    quizEvent: quizEventAnalyticsAdapter,
  });
  const analyticsReadService = new AnalyticsReadService(
    analyticsProjectionRepository,
    analyticsIntegrityService,
    projectsRepository,
  );
  const analyticsService = new AnalyticsService(
    analyticsProjectionService,
    analyticsIntegrityService,
    analyticsReadService,
  );
  const analyticsController = new AnalyticsController(analyticsService, new AnalyticsReadModelFactory());
  const projectsService = new ProjectsService(
    projectsRepository,
    gameConfigsRepository,
    journeyRepository,
    battleshipsRepository,
    lottoRepository,
    lottoBingoRepository,
    usersRepository,
    quizConfigsRepository,
    quizzesRepository,
    quizEventsRepository,
    playersRepository,
    analyticsInvalidator,
  );
  const projectsController = new ProjectsController(projectsService);
  const playersController = new PlayersController(playersService);
  const usersController = new UsersController(
    new UsersService(usersRepository, sessionsRepository, passwordHasher, projectsRepository),
  );

  const gameConfigReadModelFactory = new GameConfigReadModelFactory();
  const gameConfigsService = new GameConfigsService(
    gameConfigsRepository,
    projectsRepository,
    gameConfigReadModelFactory,
  );
  const gameConfigsController = new GameConfigsController(gameConfigsService);
  const quizConfigsService = new QuizConfigsService(
    quizConfigsRepository,
    projectsRepository,
    new QuizConfigReadModelFactory(),
  );
  const quizConfigsController = new QuizConfigsController(quizConfigsService);
  const quizzesService = new QuizzesService(
    quizzesRepository,
    quizConfigsRepository,
    projectsRepository,
    new QuizReadModelFactory(),
  );
  const quizzesController = new QuizzesController(quizzesService);

  const cryptoRandomizer = new CryptoRandomizer();
  const randomizer =
    process.env.REWARD_RANDOMIZER_DEBUG === "true" ? new LoggingRandomizer(cryptoRandomizer) : cryptoRandomizer;
  const rewardGrantService = new RewardGrantService(randomizer);
  const chatMessageIdentity = new ChatMessageIdentity();
  const quizAnswerRanker = new QuizAnswerRanker();
  const quizEventEngine = new QuizEventEngine(
    quizAnswerRanker,
    new QuizAwardCalculator(),
    new QuizEventSummaryCalculator(),
    new QuizSelectedAnswerPruner(),
  );
  const quizEventReadModelFactory = new QuizEventReadModelFactory(quizAnswerRanker);
  const quizEventsService = new QuizEventsService(
    quizEventsRepository,
    quizzesRepository,
    projectsRepository,
    playersService,
    quizEventEngine,
    new ChatParser(),
    new QuizMessageCandidateFilter(chatMessageIdentity),
    quizEventReadModelFactory,
    mongoDatabase,
    analyticsInvalidator,
    analyticsSubmitter,
  );
  const quizEventsController = new QuizEventsController(quizEventsService);
  const battleshipsEngine = new BattleshipsEngine(rewardGrantService);
  const battleshipsReadModelFactory = new BattleshipsReadModelFactory(battleshipsEngine);
  const battleshipsService = new BattleshipsService(
    battleshipsRepository,
    battleshipsEngine,
    battleshipsReadModelFactory,
    gameConfigsService,
    playersService,
    mongoDatabase,
    analyticsInvalidator,
    analyticsSubmitter,
  );
  const battleshipsController = new BattleshipsController(battleshipsService);
  const journeyResourceInventoryService = new JourneyResourceInventoryService();
  const journeyCommentTemplateRotator = new JourneyCommentTemplateRotator();
  const journeyRewardCommentFormatter = new JourneyRewardCommentFormatter();
  const journeyV2Engine = new JourneyV2Engine(
    rewardGrantService,
    journeyResourceInventoryService,
    journeyRewardCommentFormatter,
    journeyCommentTemplateRotator,
  );
  const journeyReadModelFactory = new JourneyReadModelFactory(journeyV2Engine);
  const journeyForumStateFormatter = new JourneyForumStateFormatter();
  const forumTopicService = new ForumTopicService();
  const journeyForumMovesImporter = new JourneyForumMovesImporter(forumTopicService);
  const journeyForumPlayersImporter = new JourneyForumPlayersImporter(forumTopicService);
  const journeyParser = new JourneyParser();
  const journeyService = new JourneyService(
    journeyRepository,
    journeyV2Engine,
    journeyReadModelFactory,
    journeyParser,
    gameConfigsService,
    journeyForumStateFormatter,
    journeyForumMovesImporter,
    journeyForumPlayersImporter,
    playersService,
    mongoDatabase,
    analyticsInvalidator,
    analyticsSubmitter,
  );
  const journeyController = new JourneyController(journeyService);

  const lottoEngine = new LottoEngine(rewardGrantService, new LottoPayoutDistributor());
  const lottoReadModelFactory = new LottoReadModelFactory(lottoEngine);
  const lottoService = new LottoService(
    lottoRepository,
    lottoEngine,
    lottoReadModelFactory,
    gameConfigsService,
    playersService,
    mongoDatabase,
    analyticsInvalidator,
    analyticsSubmitter,
  );
  const lottoController = new LottoController(lottoService);
  const lottoBingoEngine = new LottoBingoEngine(new LottoBingoTicketGenerator(), rewardGrantService);
  const lottoBingoReadModelFactory = new LottoBingoReadModelFactory(lottoBingoEngine);
  const lottoBingoService = new LottoBingoService(
    lottoBingoRepository,
    lottoBingoEngine,
    lottoBingoReadModelFactory,
    gameConfigsService,
    new LottoBingoUpdatePublisher(),
    playersService,
    mongoDatabase,
    analyticsInvalidator,
    analyticsSubmitter,
  );
  const lottoBingoController = new LottoBingoController(lottoBingoService);

  const forumTopicController = new ForumTopicController(forumTopicService);

  return {
    analyticsController,
    authController,
    authService,
    battleshipsController,
    forumTopicController,
    gameConfigsController,
    journeyController,
    lottoController,
    lottoBingoController,
    projectsController,
    playersController,
    quizConfigsController,
    quizzesController,
    quizEventsController,
    usersController,
  };
}
