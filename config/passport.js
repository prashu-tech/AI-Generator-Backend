// config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../src/models/user.model.js"; // adjust path if needed
// 🔥 FIXED: Dynamic configuration based on environment
const getGoogleConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    callbackURL: isDevelopment 
      ? process.env.GOOGLE_CALLBACK_URL_DEV || "http://localhost:4000/auth/google/callback"
      : process.env.GOOGLE_CALLBACK_URL_PROD || "https://ai-generator-backend-rlc5.onrender.com/auth/google/callback",
    
    clientURL: isDevelopment
      ? process.env.CLIENT_URL_DEV || "http://localhost:3000"
      : process.env.CLIENT_URL_PROD || "https://your-deployed-frontend-url.com"
  };
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: getGoogleConfig().callbackURL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔥 Google Strategy Callback:', {
          profileId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName
        });

        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const avatar = profile.photos?.[0]?.value || "";
        const username = profile.displayName || profile.name?.givenName || 'Google User';

        // Find by googleId first, else by email
        let user = null;
        if (googleId) {
          user = await User.findOne({ googleId });
        }
        if (!user && email) {
          user = await User.findOne({ email });
        }

        // If no user found -> DO NOT auto-create. Ask user to register first.
        if (!user) {
          console.log('🔥 User not found - needs to register first');
          return done(null, false, { message: "not_registered" });
        }

        // If user exists but email not verified -> block
        if (!user.isEmailVerified) {
          console.log('🔥 User email not verified');
          return done(null, false, { message: "email_not_verified" });
        }

        // Attach googleId if missing
        if (!user.googleId) {
          user.googleId = googleId;
          if (!user.avatar && avatar) user.avatar = avatar;
          await user.save();
        }

        console.log('🔥 Google auth successful for user:', user.email);
        return done(null, user);
      } catch (err) {
        console.error("🔥 Google strategy error:", err);
        return done(err, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

