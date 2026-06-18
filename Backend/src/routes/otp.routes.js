import { Router } from "express";
import { sendOtp, verifyOtp } from "../controllers/otp.controller.js";

const router = Router();

router.route("/send-otp").post(sendOtp);
router.route("/verify-otp").post(verifyOtp);

export default router;
