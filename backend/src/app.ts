import express from "express";
import configsRouter from "./modules/configs/routes/configs.routes";
import forumTopicRouter from "./routes/forumTopic.routes";
import journeyRouter from "./modules/journey/routes/journey.routes";

const app = express();

app.use(express.json());
app.use("/api/forum/topic", forumTopicRouter);
app.use("/api/configs", configsRouter);
app.use("/api/journey", journeyRouter);

export default app;
