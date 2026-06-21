import { Router } from "express";
import { getConfig, getConfigs } from "../controllers/configs.controller";

const router = Router();

router.get("/", getConfigs);
router.get("/:configId", getConfig);

export default router;
