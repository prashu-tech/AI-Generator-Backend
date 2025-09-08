// config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../src/models/user.model.js"; // adjust path if needed

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const avatar = profile.photos?.[0]?.value || "";

        // find by googleId first, else by email
        let user = null;
        if (googleId) {
          user = await User.findOne({ googleId });
        }
        if (!user && email) {
          user = await User.findOne({ email });
        }

        // If no user found -> DO NOT auto-create. Ask user to register first.
        if (!user) {
          return done(null, false, { message: "not_registered" });
        }

        // If user exists but email not verified -> block
        if (!user.isEmailVerified) {
          return done(null, false, { message: "email_not_verified" });
        }

        // Attach googleId if missing
        if (!user.googleId) {
          user.googleId = googleId;
          if (!user.avatar && avatar) user.avatar = avatar;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error("Google strategy error:", err);
        return done(err, null);
      }
    }
  )
);