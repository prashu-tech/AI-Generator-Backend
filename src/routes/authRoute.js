// routes/authRoute.js
import express from "express";
import passport from "passport";

const router = express.Router();

// Start Google OAuth2 login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/signin?error=google_failed`,
  }),
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=google_failed`);
      }

      if (!user.isEmailVerified) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=email_not_verified`);
      }

      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save();

      // ✅ Redirect to frontend instead of sending JSON
      const redirectUrl = `${process.env.CLIENT_URL}/auth-success/?accessToken=${accessToken}&refreshToken=${refreshToken}&user=${encodeURIComponent(
        JSON.stringify({
          id: user._id,
          email: user.email,
          username: user.username,
        })
      )}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google login error:", error);
      return res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

export default router;
