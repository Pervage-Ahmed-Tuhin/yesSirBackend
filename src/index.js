import express from "express";
import { connectDB } from "../lib/db.js";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import classroomRoutes from "./routes/classroom.js";
import attendanceRoutes from "./routes/attendance.js";
import usersRoutes from "./routes/users.js";
import attendanceCleanupService from "./services/attendanceCleanup.js";

// Load environment variables
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '***hidden***' : 'MISSING'
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/users", usersRoutes);

// Basic health check route
app.get("/", (req, res) => {
    res.json({ 
        message: "Yes Sir Server is running!",
        version: "1.0.0",
        endpoints: {
            "POST /api/auth/register/student": "Register a new student",
            "POST /api/auth/register/teacher": "Register a new teacher",
            "GET /api/auth/profile/:clerkUserId": "Get user profile",
            "PUT /api/auth/profile/:clerkUserId": "Update user profile",
            "POST /api/classroom/create": "Create a new classroom",
            "GET /api/classroom/teacher/:teacherId": "Get classrooms by teacher ID",
            "GET /api/classroom/code/:classCode": "Get classroom by class code",
            "POST /api/classroom/join": "Join a classroom as student"
        }
    });
});

// Start server and connect to database
const startServer = async () => {
    try {
        // Connect to MongoDB first
        await connectDB();
        
        // Attendance cleanup service is disabled - using manual cleanup when teacher finishes session
        // attendanceCleanupService.start();
        console.log('ℹ️  Automatic cleanup disabled - using manual cleanup on session completion');
        
        // Start server after successful DB connection
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Local: http://localhost:${PORT}`);
            console.log(`Network: http://192.168.0.220:${PORT}`);
            console.log(`React Native API: http://192.168.0.220:${PORT}/api`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

// Graceful shutdown handling
const gracefulShutdown = () => {
    console.log('\n🛑 Shutting down server gracefully...');
    attendanceCleanupService.stop();
    process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

startServer();
