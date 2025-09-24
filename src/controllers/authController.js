// controllers/authController.js
import { User } from '../models/user.model.js';
import PasswordResetToken from '../models/passwordResetToken.js'; 
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler.js';

// 🔥 ADDED: Helper function for dynamic client URL
const getClientURL = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const clientURL = isDevelopment
    ? process.env.CLIENT_URL_DEV || 'http://localhost:3000'
    : process.env.CLIENT_URL_PROD || 'https://ai-generator-sbgv.onrender.com';
  
  console.log('🔥 Using client URL:', clientURL, '(NODE_ENV:', process.env.NODE_ENV, ')');
  return clientURL;
};

// 🔥 ENHANCED: Sign In with Remember Me (Uses YOUR token methods)
export const signIn = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
 
  try {
    // Find user with password field (since select: false in your model)
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 🔥 USE YOUR EXISTING METHOD: isPasswordCorrect
    const isValidPassword = await user.isPasswordCorrect(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 🔥 USE YOUR EXISTING METHODS: generateAccessToken & generateRefreshToken
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Update last login and save refresh token
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    
    // Add to login history
    user.loginHistory.push({
      time: new Date(),
      ip: req.ip || req.connection.remoteAddress
    });

    await user.save({ validateBeforeSave: false });

    // Send response using YOUR user structure
    res.status(200).json({
      success: true,
      message: rememberMe ? 'Signed in successfully (Remember Me enabled)' : 'Signed in successfully',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.username,
        email: user.email,
        verified: user.isEmailVerified,
        avatar: user.avatar,
        registrationDate: user.createdAt,
        lastLogin: user.lastLogin
      },
      rememberMe: rememberMe || false
    });

  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during sign in'
    });
  }
});

// 🔥 FIXED: Forgot Password with correct URL
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required'
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 3600000; // 1 hour

    // Delete existing reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });

    // Create new reset token
    await PasswordResetToken.create({
      userId: user._id,
      token: resetToken,
      expiry: tokenExpiry
    });

    // 🔥 FIXED: Use dynamic client URL
    const clientURL = getClientURL();
    const resetUrl = `${clientURL}/reset-password/${resetToken}`;

    console.log('🔥 Sending password reset email to:', user.email);
    console.log('🔥 Reset URL:', resetUrl);

    // Beautiful HTML email template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 15px; text-align: center; color: white;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px;">🎨 Art Style Transfer</h1>
          <h2 style="margin: 0 0 30px 0; font-weight: normal; opacity: 0.9;">Password Reset Request</h2>
          
          <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">
              Hello <strong>${user.username || 'User'}</strong>,<br><br>
              We received a request to reset your password. Click the button below to create a new password.
            </p>
            
            <a href="${resetUrl}" 
               style="display: inline-block; background: white; color: #667eea; padding: 15px 35px; 
                      text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                      box-shadow: 0 5px 15px rgba(0,0,0,0.2); transition: all 0.3s;">
              🔐 Reset My Password
            </a>
            
            <p style="margin: 25px 0 0 0; font-size: 14px; opacity: 0.8;">
              This link will expire in 1 hour for security reasons.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #666;">
          <p style="margin: 0 0 10px 0; font-size: 13px;">
            If you didn't request this password reset, you can safely ignore this email.
          </p>
          <p style="margin: 0; font-size: 12px;">
            Having trouble with the button? Copy this link: <br>
            <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
      </div>
    `;

    // 🔥 USE YOUR EXISTING sendEmail UTILITY
    await sendEmail({
      to: user.email,
      subject: '🔐 Password Reset Request - Art Style Transfer',
      html: htmlContent
    });

    res.status(200).json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('🔥 Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email. Please try again later.'
    });
  }
});

// 🔥 EXISTING: Keep your resetPassword function as-is
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Password and confirmation are required'
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }

  try {
    // Find valid reset token
    const resetTokenDoc = await PasswordResetToken.findOne({ 
      token,
      expiry: { $gt: Date.now() }
    });

    if (!resetTokenDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find user
    const user = await User.findById(resetTokenDoc.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 🔥 USE YOUR EXISTING PASSWORD HASHING: pre-save middleware will hash it
    user.password = password;
    await user.save();

    // Delete all reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });

  } catch (error) {
    console.error('🔥 Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
});
