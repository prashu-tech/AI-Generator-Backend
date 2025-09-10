import sendEmail from "../utils/sendEmail.js";
import { User } from "../models/user.model.js";
import generateOTP from "../utils/generateOTP.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import rateLimit from "express-rate-limit";
import { OTP } from "../models/otp.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";




// Rate limiting for OTP requests
const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  //max: 3, // limit each IP to 3 requests per windowMs
  //message: "Too many OTP requests, please try again later.",
});


// controller to initiate email verification

const initiateEmailVerification = [ 
  otpRateLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    console.log("\n===== [INITIATE EMAIL VERIFICATION] =====");
    console.log("Incoming request email:", email);

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log("❌ Invalid email format");
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message: "Please provide a valid email address",
      });
    }

    // Check if email already exists and is verified
    const existingUser = await User.findOne({ email });
    if (existingUser?.isEmailVerified) {
      console.log("❌ Email already verified:", email);
      return res.status(400).json({
        success: false,
        code: "EMAIL_ALREADY_VERIFIED",
        message: "Email already registered. Please sign in.",
      });
    }

    // Remove previous OTPs
    console.log("🗑️ Deleting old OTPs for:", email);
    await OTP.deleteMany({ email, purpose: 'email-verification' });

    // Generate OTP
    const otp = generateOTP();
    function getOtpExpiry(minutes = 5) {
      return new Date(Date.now() + minutes * 60 * 1000);
    }

    console.log("🔑 Generated OTP:", otp);

    // Create OTP record
    try {
      console.log("💾 Attempting to save OTP in DB...");
      const otpDoc = await OTP.create({
        email,
        code: otp,
        purpose: "email-verification", 
        expiresAt: getOtpExpiry(5)
      });
      console.log("✅ OTP saved successfully:", otpDoc);
    } catch (err) {
      console.error("❌ OTP create error:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to save OTP", 
        error: err.message 
      });
    }

    const expiry = getOtpExpiry(5);
    console.log("⏳ Current time:", new Date().toISOString());
    console.log("⏳ Will expire at:", expiry.toISOString());

    // 🔥 ENHANCED: Send beautiful styled email
    try {
      await sendEmail({
        to: email,
        subject: "🔐 Verify Your Email - Art Style Transfer",
        html: generateOTPEmailTemplate(otp, 'Valued User'), // You can pass username if available
      });
      console.log("📧 Styled OTP email sent to:", email);
    } catch (emailError) {
      console.error("❌ Email sending failed:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
    });
  }),
];



// utils/emailTemplates.js or in your controller
const generateOTPEmailTemplate = (otp, username = 'User') => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification - Art Style Transfer</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
        
        <!-- Main Container -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 15px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          
          <!-- Header -->
          <div style="margin-bottom: 30px;">
            <h1 style="margin: 0 0 10px 0; font-size: 32px; font-weight: bold;">🎨 Art Style Transfer</h1>
            <div style="height: 3px; width: 80px; background: rgba(255,255,255,0.8); margin: 10px auto; border-radius: 2px;"></div>
          </div>

          <!-- Content Section -->
          <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 12px; margin: 20px 0; backdrop-filter: blur(10px);">
            <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: normal; opacity: 0.95;">
              Email Verification Required
            </h2>
            
            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; opacity: 0.9;">
              Hello <strong>${username}</strong>,<br><br>
              Please use the verification code below to confirm your email address and complete your registration.
            </p>
            
            <!-- OTP Display -->
            <div style="background: white; color: #667eea; font-weight: bold; font-size: 36px; padding: 20px 40px; border-radius: 50px; letter-spacing: 8px; margin: 25px 0; box-shadow: 0 5px 15px rgba(0,0,0,0.2); display: inline-block; border: 3px solid rgba(255,255,255,0.3);">
              ${otp}
            </div>
            
            <!-- Timer Warning -->
            <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                ⏰ <strong>This code expires in 5 minutes</strong>
              </p>
              <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.7;">
                For security reasons, please don't share this code with anyone.
              </p>
            </div>
          </div>
          
          <!-- Instructions -->
          <div style="margin-top: 30px;">
            <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.85;">
              Enter this code in the verification page to activate your account.
            </p>
            <p style="margin: 0; font-size: 12px; opacity: 0.7;">
              Having trouble? Contact our support team for assistance.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding: 20px; color: #666;">
          <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
            <p style="margin: 0 0 10px 0; font-size: 13px;">
              If you didn't request this verification code, please ignore this email or contact our support team.
            </p>
            <p style="margin: 0 0 15px 0; font-size: 12px; color: #999;">
              This is an automated message, please do not reply to this email.
            </p>
            
            <!-- Branding Footer -->
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                <strong>Art Style Transfer</strong> - Transform your imagination into stunning visuals
              </p>
              <p style="margin: 5px 0 0 0; font-size: 11px; color: #aaa;">
                © 2025 Art Style Transfer. All rights reserved.
              </p>
            </div>
          </div>
        </div>
        
        <!-- Mobile Responsive Styles -->
        <style>
          @media only screen and (max-width: 600px) {
            .email-container {
              padding: 10px !important;
            }
            .otp-code {
              font-size: 20px !important;
              letter-spacing: 4px !important;
              padding: 15px 25px !important;
            }
          }
        </style>
      </div>
    </body>
    </html>
  `;
};



// controller to verify email OTP

const verifyEmailOTP = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      code: 'MISSING_FIELDS',
      message: 'Email and OTP are required',
    });
  }

  const record = await OTP.findOne({ email, code: otp, purpose: "email-verification" });

  if (!record || record.expiresAt < Date.now()) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_OR_EXPIRED_OTP',
      message: 'Invalid or expired OTP',
    });
  }

  // Delete OTP after success
  await OTP.deleteMany({ email, purpose: 'email-verification' });

  // Create or update user
  let user = await User.findOne({ email });

  if (!user) {
    user = new User({
      email,
      isEmailVerified: true,
      username: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    });
    await user.save();
  } else {
    user.isEmailVerified = true;
    await user.save();
  }


  // Generate a temporary token for completing registration
  const tempToken = jwt.sign({ id: user._id, email: user.email, temp: true }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });


  // ✅ Do NOT generate tokens here
  res.status(200).json({
    success: true,
    message: "Email verified successfully. Please complete registration.",
    data: {
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
      tempToken,
    }
  });
});



const completeRegistration = asyncHandler(async (req, res) => {
  const { username, password, confirmPassword } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded.temp) {
      return res.status(401).json({ success: false, message: "Invalid token for this action" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!username || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    if (user.username && user.password) {
      return res.status(400).json({ success: false, message: "Profile is already completed." });
    }

    user.username = username;
    user.password = password; // pre-save hook hashes it
    user.isEmailVerified = true;

    await user.save();

    res.status(201).json({
      success: true,
      message: "Account registration completed successfully. Please sign in to continue.",
      user: {
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
});



const signin = asyncHandler(async(req, res) => {
  const { email, password} = req.body;

  // 1. validate required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and Password are required.",
    });
  }

  // 2. Find user by email
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isEmailVerified) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or pasword.",
    });
  }

  // 3. check password
  const isMatch = await user.isPasswordCorrect(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  // ❶  Record login
  user.lastLogin = new Date();
  user.loginHistory = user.loginHistory || [];
  user.loginHistory.push({ time: user.lastLogin, ip: req.ip });

  // 4. Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;

  await user.save();

  // 5. Respond with success
  res.status(200).json({
    success: true,
    message: "Login successful.",
    user: {
      _id: user.id,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
    },
    accessToken,
    refreshToken,
  });

});


const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found"});
  }

  res.json({
    success: true,
    user: {
      name: user.username,
      email: user.email,
      registrationDate: user.createdAt,
      lastLogin: user.lastLogin,
      verified: user.isEmailVerified,
    }
  })
})


const googleCallbackHandler = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=google_failed`);
    }

    if (!user.isEmailVerified) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=email_not_verified`);
    }

    if (!user.isProfileComplete) {
      return res.redirect(
        `${process.env.CLIENT_URL}/complete-registration?email=${encodeURIComponent(user.email)}`
      );
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // set cookie (optional)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ✅ send both tokens & user back to frontend
    return res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&email=${encodeURIComponent(user.email)}`
    );

  } catch (err) {
    console.error("googleCallbackHandler error:", err);
    return res.redirect(`${process.env.CLIENT_URL}/login?error=google_callback_error`);
  }
});


const logoutHandler = asyncHandler(async (req, res) => {
  // If you used sessions: req.logout()
  // For JWT flow, client just deletes the token. Optionally clear cookie:
  res.clearCookie("refreshToken");
  return res.redirect(`${process.env.CLIENT_URL}/login?message=logged_out`);
})



export {
  initiateEmailVerification,
  generateOTPEmailTemplate,
  verifyEmailOTP,
  completeRegistration,
  signin,
  getProfile,
  googleCallbackHandler,
  logoutHandler
};
