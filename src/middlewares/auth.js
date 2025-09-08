// middleware/auth.js
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log('Middleware Decoded:', decoded);
    const userId = decoded.userId || decoded._id || decoded.id; // Prioritize userId
    console.log('Using userId:', userId); // Debug the selected ID
    req.user = await User.findById(decoded.id || decoded._id || decoded.userId);
    if (!req.user && !decoded.temp) {
      return res.status(401).json({ message: "Invalid token" });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
