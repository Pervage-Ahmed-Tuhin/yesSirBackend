import express from 'express';
import { Attendance, AttendanceSession } from '../models/Attendance.js';
import Classroom from '../models/classroom.js';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import attendanceCleanupService from '../services/attendanceCleanup.js';

const router = express.Router();

// Cloudinary configuration will be done on first use to ensure env vars are loaded

// Configure multer for handling multipart/form-data
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Start attendance session
router.post('/start-session/:classroomId', async (req, res) => {
    try {
        const { classroomId } = req.params;
        
        console.log('Starting attendance session for classroom:', classroomId);

        // Check if classroom exists
        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            console.log('Classroom not found:', classroomId);
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // End any existing active session for this classroom
        const endedSessions = await AttendanceSession.updateMany(
            { classroomId, isActive: true },
            { isActive: false, endedAt: new Date() }
        );
        
        console.log('Ended existing sessions:', endedSessions);

        // Create new session
        const sessionId = uuidv4();
        const newSession = new AttendanceSession({
            classroomId,
            sessionId,
            isActive: true,
            startedAt: new Date(),
            duration: 300 // 5 minutes in seconds
        });

        await newSession.save();
        console.log('New session created:', newSession);

        // Set timer to auto-end session after 5 minutes
        setTimeout(async () => {
            console.log('Auto-ending session:', sessionId);
            await AttendanceSession.findOneAndUpdate(
                { sessionId, isActive: true },
                { isActive: false, endedAt: new Date() }
            );
            console.log('Session auto-ended:', sessionId);
        }, 300000); // 5 minutes (300 seconds * 1000ms)

        res.json({
            success: true,
            message: 'Attendance session started',
            sessionId
        });

    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start attendance session'
        });
    }
});

// Stop attendance session
router.post('/stop-session/:classroomId', async (req, res) => {
    try {
        const { classroomId } = req.params;
        
        console.log('Attempting to stop session for classroom:', classroomId);

        // First check if there's an active session
        const activeSession = await AttendanceSession.findOne({
            classroomId, 
            isActive: true 
        });
        
        console.log('Found active session:', activeSession);

        if (!activeSession) {
            console.log('No active session found for classroom:', classroomId);
            // Let's check if there are any sessions at all for this classroom
            const allSessions = await AttendanceSession.find({ classroomId });
            console.log('All sessions for this classroom:', allSessions);
            
            // Return success even if no active session - this handles the case where
            // the session already expired or was stopped
            return res.json({
                success: true,
                message: 'No active session to stop (session may have already ended)',
                wasActive: false
            });
        }

        const session = await AttendanceSession.findOneAndUpdate(
            { classroomId, isActive: true },
            { isActive: false, endedAt: new Date() },
            { new: true }
        );

        console.log('Session stopped successfully:', session);
        res.json({
            success: true,
            message: 'Attendance session stopped',
            wasActive: true
        });

    } catch (error) {
        console.error('Stop session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop attendance session'
        });
    }
});

// Check attendance session status
router.get('/session-status/:classroomId', async (req, res) => {
    try {
        const { classroomId } = req.params;
        
        console.log('Checking session status for classroom:', classroomId);

        const activeSession = await AttendanceSession.findOne({
            classroomId,
            isActive: true
        });

        console.log('Active session found:', activeSession);

        if (!activeSession) {
            console.log('No active session for classroom:', classroomId);
            return res.json({
                success: true,
                isActive: false,
                timeRemaining: 0
            });
        }

        // Calculate time remaining
        const now = new Date();
        const sessionStart = new Date(activeSession.startedAt);
        const elapsed = Math.floor((now - sessionStart) / 1000);
        const timeRemaining = Math.max(0, activeSession.duration - elapsed);

        console.log('Time calculation:', {
            now: now.toISOString(),
            sessionStart: sessionStart.toISOString(),
            elapsed,
            duration: activeSession.duration,
            timeRemaining
        });

        // If time is up, deactivate session
        if (timeRemaining === 0) {
            console.log('Session time expired, deactivating...');
            activeSession.isActive = false;
            activeSession.endedAt = new Date();
            await activeSession.save();
        }

        const response = {
            success: true,
            isActive: activeSession.isActive && timeRemaining > 0,
            timeRemaining,
            sessionId: activeSession.sessionId
        };

        console.log('Session status response:', response);

        res.json(response);

    } catch (error) {
        console.error('Session status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check session status'
        });
    }
});

// Submit attendance
router.post('/submit/:classroomId', upload.single('photo'), async (req, res) => {
    try {
        // Configure Cloudinary here to ensure env vars are loaded
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        console.log('Cloudinary config at submit time:', {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET ? '***hidden***' : 'MISSING'
        });

        const { classroomId } = req.params;
        const { studentId, studentName, studentEmail } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Photo is required'
            });
        }

        // Check if there's an active session
        const activeSession = await AttendanceSession.findOne({
            classroomId,
            isActive: true
        });

        if (!activeSession) {
            return res.status(400).json({
                success: false,
                message: 'No active attendance session'
            });
        }

        // Check if student already submitted today (not just for this session)
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const existingAttendance = await Attendance.findOne({
            classroomId,
            studentId,
            submittedAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted attendance today. Only one submission per day is allowed.'
            });
        }

        // Upload image to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: 'attendance_photos',
                    public_id: `${studentId}_${Date.now()}`,
                    resource_type: 'image'
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(req.file.buffer);
        });

        // Save attendance record
        const attendance = new Attendance({
            classroomId,
            studentId,
            studentName,
            studentEmail,
            photoUrl: uploadResult.secure_url,
            sessionId: activeSession.sessionId,
            submittedAt: new Date()
        });

        await attendance.save();

        res.json({
            success: true,
            message: 'Attendance submitted successfully',
            attendanceId: attendance._id
        });

    } catch (error) {
        console.error('Submit attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit attendance'
        });
    }
});

// Get attendance list for a classroom (today's attendance)
router.get('/list/:classroomId', async (req, res) => {
    try {
        const { classroomId } = req.params;
        const { date } = req.query;

        // Default to today if no date provided
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        const attendanceList = await Attendance.find({
            classroomId,
            submittedAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }).sort({ submittedAt: -1 });

        console.log(`Found ${attendanceList.length} attendance records for classroom ${classroomId} on ${targetDate.toDateString()}`);

        res.json({
            success: true,
            attendanceList,
            count: attendanceList.length
        });

    } catch (error) {
        console.error('Get attendance list error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get attendance list'
        });
    }
});

// Generate Excel report
router.post('/generate-excel/:classroomId', async (req, res) => {
    try {
        // Configure Cloudinary here to ensure env vars are loaded
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        const { classroomId } = req.params;
        const { date } = req.body;

        // Get classroom info
        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Default to today if no date provided
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        // Get attendance data
        const attendanceList = await Attendance.find({
            classroomId,
            submittedAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }).sort({ submittedAt: 1 });

        console.log(`Found ${attendanceList.length} attendance records for Excel generation`);

        if (attendanceList.length === 0) {
            return res.json({
                success: false,
                message: 'No attendance records found for today'
            });
        }

        // Create Excel workbook with simplified format
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');

        // Add headers - simplified to requested fields only
        worksheet.columns = [
            { header: 'Student ID', key: 'studentId', width: 20 },
            { header: 'Photo URL', key: 'photoUrl', width: 60 },
            { header: 'Course Name', key: 'courseName', width: 30 },
            { header: 'Date', key: 'date', width: 15 }
        ];

        // Add data with simplified fields
        attendanceList.forEach(attendance => {
            worksheet.addRow({
                studentId: attendance.studentId,
                photoUrl: attendance.photoUrl,
                courseName: classroom.courseName,
                date: targetDate.toDateString()
            });
        });

        // Style headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        console.log('Excel workbook created, generating buffer...');

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        
        console.log('Buffer generated, uploading to Cloudinary...');

        // Upload to Cloudinary as raw file
        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: 'attendance_reports',
                    public_id: `attendance_${classroomId}_${Date.now()}`,
                    resource_type: 'raw'
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        console.log('Cloudinary upload successful:', result.secure_url);
                        resolve(result);
                    }
                }
            ).end(buffer);
        });

        console.log('Excel uploaded successfully');

        res.json({
            success: true,
            message: `Excel report generated successfully with ${attendanceList.length} records.`,
            downloadUrl: uploadResult.secure_url,
            fileName: `${classroom.courseName}_attendance_${targetDate.toISOString().split('T')[0]}.xlsx`,
            recordsProcessed: attendanceList.length
        });

    } catch (error) {
        console.error('Generate Excel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate Excel report'
        });
    }
});

// Manual cleanup endpoint (for admin/testing purposes)
router.post('/cleanup/now', async (req, res) => {
    try {
        console.log('📞 Manual cleanup requested via API');
        await attendanceCleanupService.cleanupNow();
        
        res.json({
            success: true,
            message: 'Manual cleanup completed successfully'
        });
    } catch (error) {
        console.error('Manual cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'Manual cleanup failed',
            error: error.message
        });
    }
});

// Get cleanup statistics
router.get('/cleanup/stats', async (req, res) => {
    try {
        const stats = await attendanceCleanupService.getCleanupStats();
        
        if (!stats) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get cleanup statistics'
            });
        }

        res.json({
            success: true,
            stats: {
                ...stats,
                message: {
                    total: `Total: ${stats.totalSessions} sessions, ${stats.totalAttendance} attendance records`,
                    old: `Old (will be deleted): ${stats.oldSessions} sessions, ${stats.oldAttendanceCount} attendance records`,
                    recent: `Recent (safe): ${stats.recentSessions} sessions, ${stats.recentAttendanceCount} attendance records`,
                    cutoff: `Data older than ${stats.cutoffTime.toISOString()} will be deleted`,
                    schedule: `Cleanup runs every ${stats.checkInterval / 60000} minutes, deletes data after ${stats.cleanupDelay / 60000} minutes`
                }
            }
        });
    } catch (error) {
        console.error('Get cleanup stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cleanup statistics',
            error: error.message
        });
    }
});

// Delete session and attendance data (called when teacher finishes session)
router.delete('/cleanup-session/:classroomId', async (req, res) => {
    try {
        const { classroomId } = req.params;
        
        console.log('🧹 Manual cleanup requested for classroom:', classroomId);

        // Get today's date range to delete only today's data
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // Find today's sessions for this classroom
        const todaySessions = await AttendanceSession.find({
            classroomId,
            startedAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        if (todaySessions.length === 0) {
            console.log('No sessions found for today for classroom:', classroomId);
            return res.json({
                success: true,
                message: 'No sessions found for today',
                deletedSessions: 0,
                deletedAttendance: 0
            });
        }

        // Get session IDs for today
        const sessionIds = todaySessions.map(session => session.sessionId);
        
        console.log(`Found ${todaySessions.length} session(s) for today:`, sessionIds);

        // Delete attendance records for today's sessions
        const attendanceDeleteResult = await Attendance.deleteMany({
            classroomId,
            submittedAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        // Delete today's attendance sessions
        const sessionDeleteResult = await AttendanceSession.deleteMany({
            classroomId,
            startedAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        console.log(`✅ Manual cleanup completed successfully:`);
        console.log(`   - Deleted ${attendanceDeleteResult.deletedCount} attendance records`);
        console.log(`   - Deleted ${sessionDeleteResult.deletedCount} attendance sessions`);
        console.log(`💾 Database space freed up for classroom ${classroomId}!`);

        res.json({
            success: true,
            message: 'Session data deleted successfully',
            deletedSessions: sessionDeleteResult.deletedCount,
            deletedAttendance: attendanceDeleteResult.deletedCount,
            classroom: classroomId,
            cleanupDate: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error during manual cleanup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete session data',
            error: error.message
        });
    }
});

export default router;
