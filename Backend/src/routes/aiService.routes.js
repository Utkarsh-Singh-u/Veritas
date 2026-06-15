import { Router } from "express";
import { verifyApiKey } from "../middlewares/apiKey.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { detectDeepfake } from "../controllers/aiService.controller.js";

const router = Router();

router.route("/predict").post(verifyApiKey, upload.single("image"), detectDeepfake);

export default router;