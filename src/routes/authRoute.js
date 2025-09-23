// routes/authRoute.js
import express from "express";
import passport from "passport";

const router = express.Router();

// 🔥 ADDED: Dynamic URL helper for dev/prod compatibility
const getClientURL = () => {
  return process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.CLIENT_URL || 'https://your-deployed-frontend-url.com';
};

// Start Google OAuth2 login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${getClientURL()}/signin?error=google_failed`,
  }),
  async (req, res) => {
    try {
      console.log('🔥 Google callback triggered');
      
      const user = req.user;
      if (!user) {
        console.log('🔥 No user found in callback');
        return res.redirect(`${getClientURL()}/signin?error=google_failed`);
      }

      console.log('🔥 User found:', user.email);

      // 🔥 FIXED: Check email verification
      if (!user.isEmailVerified) {
        console.log('🔥 User email not verified');
        return res.redirect(`${getClientURL()}/signin?error=email_not_verified`);
      }

      // 🔥 ADDED: Error handling for token generation
      let accessToken, refreshToken;
      try {
        accessToken = user.generateAccessToken();
        refreshToken = user.generateRefreshToken();
        console.log('🔥 Tokens generated successfully');
      } catch (tokenError) {
        console.error('🔥 Token generation error:', tokenError);
        return res.redirect(`${getClientURL()}/signin?error=token_generation_failed`);
      }

      // Save refresh token
      try {
        user.refreshToken = refreshToken;
        await user.save();
        console.log('🔥 User refresh token saved');
      } catch (saveError) {
        console.error('🔥 Error saving refresh token:', saveError);
        // Continue anyway, as tokens are still valid
      }

      // 🔥 FIXED: Build redirect URL
      const clientURL = getClientURL();
      const userData = {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar || null,
      };

      const redirectUrl = `${clientURL}/auth-success?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&user=${encodeURIComponent(JSON.stringify(userData))}`;

      console.log('🔥 Redirecting to frontend:', redirectUrl.substring(0, 100) + '...');
      
      return res.redirect(redirectUrl);
      
    } catch (error) {
      console.error("🔥 Google login callback error:", error);
      return res.redirect(`${getClientURL()}/signin?error=server_error`);
    }
  }
);

export default router;
