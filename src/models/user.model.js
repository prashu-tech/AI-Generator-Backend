import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers and underscores",
      ],
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never return password in queries
    },
    googleId: {
    type: String,
    required: false,
    sparse: true,   // ensures uniqueness only when googleId is not null
    unique: true,   // only enforce uniqueness if value exists
    default: undefined // ⚡️ avoid inserting null
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
    avatar: {
      type: String,
      default: "default-avatar-url",
    },
    emailVerification: {
      otp: String,
      otpExpires: Date,
      attempts: {
        type: Number,
        default: 0,
      },
      lastSent: Date,
    },
    loginHistory: [
      {
        time: { type: Date, required: true },
        ip: { type: String },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        return ret;
      },
    },
    // Add to userSchema
    history: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ImageHistory",
      },
    ],
  }
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // ✅ Step 1: skip if not changed
  this.password = await bcrypt.hash(this.password, 10); // ✅ Step 2: hash password
  next(); // ✅ Step 3: move to next
});

// Password comparison method
userSchema.methods.isPasswordCorrect = async function (entrePassword) {
  return await bcrypt.compare(entrePassword, this.password);
};

// Generate access token
userSchema.methods.generateAccessToken = function () {
  try {
    return jwt.sign(
      {
        userId: this._id,
        email: this.email,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
      }
    );
  } catch {
    throw new Error("failed to generating access token");
  }
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
  try {
    return jwt.sign(
      {
        _id: this._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
      }
    );
  } catch (error) {
    throw new Error("failed to generating refresh token");
  }
};

export const User = mongoose.model("User", userSchema);
