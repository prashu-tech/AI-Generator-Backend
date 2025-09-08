// routes/authRoutes.js (add these new routes)
import express from 'express';
import { signIn, forgotPassword, resetPassword } from '../controllers/authController.js';

const router = express.Router();

// 🔥 ENHANCED: Sign in with Remember Me support  
router.post('/signin', signIn);

// 🔥 NEW: Forgot password routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// ... your existing routes (register, google auth, etc.)

export default router;
