import { Router } from "express";
import { getForumTopic } from "../controllers/forumTopic.controller";

const router = Router();

router.get("/", getForumTopic);

export default router;
