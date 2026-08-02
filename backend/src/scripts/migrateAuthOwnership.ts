import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

const APPLY = "--apply";
const CONFIRM_DROP_GAMES = "--confirm-drop-games";
const DEFAULT_NAME = "Геральт из Ривии";

async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const database = client.db(connection.getDatabaseName());
  try {
    const login = process.env.BOOTSTRAP_ADMIN_LOGIN?.trim().toLowerCase();
    if (!login) throw new Error("BOOTSTRAP_ADMIN_LOGIN is required");
    const admin = await database.collection("users").findOne({ login });
    if (!admin) throw new Error(`Bootstrap administrator "${login}" was not found. Start the backend once first.`);
    const adminId = admin._id.toHexString();
    const [projects, configs, journeyGames, battleshipsGames, lottoGames] = await Promise.all([
      database.collection("projects").find({}).toArray(),
      database.collection("game_configs").find({}).toArray(),
      database.collection("journey_games").countDocuments(),
      database.collection("battleships_games").countDocuments(),
      database.collection("lotto_games").countDocuments(),
    ]);
    const report = {
      database: connection.getDatabaseName(), adminId, projects: projects.length, gameConfigs: configs.length,
      gamesToDrop: { journey: journeyGames, battleships: battleshipsGames, lotto: lottoGames }, applied: false,
    };
    if (!process.argv.includes(APPLY) || !process.argv.includes(CONFIRM_DROP_GAMES)) {
      console.log(JSON.stringify({ ...report, nextStep: `Run with ${APPLY} ${CONFIRM_DROP_GAMES} after verifying this report.` }, null, 2));
      return;
    }
    const now = new Date().toISOString();
    await Promise.all([
      database.collection("projects").updateMany({}, { $set: { createdByUserId: adminId, updatedByUserId: adminId } }),
      database.collection("game_configs").updateMany({}, { $set: { isSystem: true, createdByUserId: adminId, updatedByUserId: adminId } }),
      database.collection("users").updateOne({ _id: admin._id }, { $set: {
        displayName: DEFAULT_NAME,
        projectProfiles: projects.map((project) => ({ projectId: project._id.toHexString(), nickname: DEFAULT_NAME })),
        updatedAt: now,
      } }),
      database.collection("journey_games").deleteMany({}),
      database.collection("battleships_games").deleteMany({}),
      database.collection("lotto_games").deleteMany({}),
    ]);
    console.log(JSON.stringify({ ...report, applied: true }, null, 2));
  } finally { await client.close(); }
}

run().catch((error) => { console.error("Auth ownership migration failed", error); process.exit(1); });
