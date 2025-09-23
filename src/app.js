import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import authRoute from './routes/authRoute.js'
import cors from 'cors';
import passport from "passport";
import "../config/passport.js"


const app = express();


// 🔥 FIXED CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'https://ai-generator-sbgv.onrender.com',
    ];
    
    // 🔥 ADD THIS - Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      return callback(new Error(`CORS policy violation: Origin ${origin} not allowed`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200,
}));

app.use(express.json({limit: '16kb'}));
app.use(express.urlencoded({limit: '16kb', extended: true}));
app.use(express.static('public'));
app.use(cookieParser());

app.use(passport.initialize());

// Routes import
import emailroute from './routes/emailRoutes.js';
import dashboardroutes from './routes/dashboardRoutes.js'
import conversationRoutes from './routes/conversationRoutes.js';
import authRoutes from './routes/authRoutes.js'





// Routes declaration
app.use("/api/v1/email", emailroute);
app.use("/auth", authRoute)
app.use("/api/v1/dashboard", dashboardroutes)
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/authRoutes", authRoutes)


// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }
  
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});


export { app };

