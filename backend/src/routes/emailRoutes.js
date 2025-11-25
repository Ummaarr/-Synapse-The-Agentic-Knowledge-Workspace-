import express from "express";
import { sendOfferEmail } from "../controllers/emailController.js";

const router = express.Router();

router.post("/send", sendOfferEmail);

export default router;





