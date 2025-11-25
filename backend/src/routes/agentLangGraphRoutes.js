import express from "express";
import { sseConnect, runAgent } from "../controllers/agentLangGraphController.js";

const router = express.Router();

router.get("/stream", sseConnect);
router.post("/run", runAgent);

export default router;






