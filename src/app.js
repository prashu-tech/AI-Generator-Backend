import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import authRoute from './routes/authRoute.js'
import cors from 'cors';
import passport from "passport";
import "../config/passport.js"


const app = express();


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
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


// a small health endpoint
app.get("/", (req, res) => res.send("OK"));




export { app };

