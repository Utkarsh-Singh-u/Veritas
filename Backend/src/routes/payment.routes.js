import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createBillingOrder, getPaymentHistory, verifyBillingPayment } from "../controllers/payment.controller.js";

const router = Router();

router.post("/order", verifyJWT, createBillingOrder);
router.post("/verify", verifyJWT, verifyBillingPayment);
router.get("/history", verifyJWT, getPaymentHistory);

export default router;