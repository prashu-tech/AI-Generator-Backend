import { Router } from 'express';
import { initiateEmailVerification, verifyEmailOTP, completeRegistration, signin, getProfile  } from "../controllers/emailController.js";
import { verifyToken } from '../middlewares/auth.js';


const router = Router();

// Email OTP routes
router.route("/initiateEmailVerification").post(initiateEmailVerification)
router.route("/verifyEmailOTP").post(verifyEmailOTP)
router.route("/completeRegistration").post(verifyToken, completeRegistration)
router.route("/signin").post(signin)
router.route("/user/profile").get(verifyToken, getProfile)


export default router;
