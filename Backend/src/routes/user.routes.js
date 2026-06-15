import { Router } from "express";
import { loginUser,logoutUser,generateApiKey,registerUser } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router=Router();

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/getapikey").post(verifyJWT,generateApiKey);
router.route("/logout").get(verifyJWT,logoutUser);

export default router;