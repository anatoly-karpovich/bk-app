import express from "express";
import forumTopicRouter from "./routes/forumTopic.routes";

const app = express();

app.use("/api/forum/topic", forumTopicRouter);

export default app;
