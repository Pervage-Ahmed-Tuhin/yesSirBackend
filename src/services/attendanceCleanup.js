import { Attendance, AttendanceSession } from '../models/Attendance.js';

class AttendanceCleanupService {
    constructor() {
        this.cleanupInterval = null;
        this.CLEANUP_DELAY = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
    }

    /**
     * Start the cleanup service
     */
    start() {
        console.log('🧹 Starting Attendance Cleanup Service...');
        console.log(`📅 Sessions will be deleted ${this.CLEANUP_DELAY / 60000} minutes after creation`);
        console.log(`🔄 Checking for old sessions every ${this.CHECK_INTERVAL / 60000} minutes`);

        // Run cleanup immediately on start
        this.runCleanup();

        // Set up periodic cleanup
        this.cleanupInterval = setInterval(() => {
            this.runCleanup();
        }, this.CHECK_INTERVAL);
    }

    /**
     * Stop the cleanup service
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('🛑 Attendance Cleanup Service stopped');
        }
    }

    /**
     * Run the cleanup process
     */
    async runCleanup() {
        try {
            const cutoffTime = new Date(Date.now() - this.CLEANUP_DELAY);
            
            console.log(`🔍 Checking for attendance sessions older than ${cutoffTime.toISOString()}`);

            // Find sessions that are older than 30 minutes
            const oldSessions = await AttendanceSession.find({
                startedAt: { $lt: cutoffTime }
            });

            if (oldSessions.length === 0) {
                console.log('✅ No old attendance sessions found for cleanup');
                return;
            }

            console.log(`🗑️ Found ${oldSessions.length} old session(s) to cleanup:`);
            
            for (const session of oldSessions) {
                console.log(`   - Session ${session.sessionId} from ${session.startedAt.toISOString()}`);
            }

            // Get session IDs for deletion
            const sessionIds = oldSessions.map(session => session.sessionId);

            // Delete all attendance records for these sessions
            const attendanceDeleteResult = await Attendance.deleteMany({
                sessionId: { $in: sessionIds }
            });

            // Delete the attendance sessions
            const sessionDeleteResult = await AttendanceSession.deleteMany({
                sessionId: { $in: sessionIds }
            });

            console.log(`✅ Cleanup completed successfully:`);
            console.log(`   - Deleted ${attendanceDeleteResult.deletedCount} attendance records`);
            console.log(`   - Deleted ${sessionDeleteResult.deletedCount} attendance sessions`);
            console.log(`💾 Database space freed up!`);

        } catch (error) {
            console.error('❌ Error during attendance cleanup:', error);
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Manual cleanup method for immediate cleanup
     */
    async cleanupNow() {
        console.log('🚀 Running manual cleanup...');
        await this.runCleanup();
    }

    /**
     * Get statistics about current data
     */
    async getCleanupStats() {
        try {
            const cutoffTime = new Date(Date.now() - this.CLEANUP_DELAY);
            
            const totalSessions = await AttendanceSession.countDocuments();
            const oldSessions = await AttendanceSession.countDocuments({
                startedAt: { $lt: cutoffTime }
            });
            const recentSessions = totalSessions - oldSessions;

            const totalAttendance = await Attendance.countDocuments();
            const oldAttendanceCount = await Attendance.countDocuments({
                sessionId: { 
                    $in: await AttendanceSession.find({
                        startedAt: { $lt: cutoffTime }
                    }).distinct('sessionId')
                }
            });
            const recentAttendanceCount = totalAttendance - oldAttendanceCount;

            return {
                totalSessions,
                oldSessions,
                recentSessions,
                totalAttendance,
                oldAttendanceCount,
                recentAttendanceCount,
                cutoffTime,
                cleanupDelay: this.CLEANUP_DELAY,
                checkInterval: this.CHECK_INTERVAL
            };
        } catch (error) {
            console.error('Error getting cleanup stats:', error);
            return null;
        }
    }
}

// Create singleton instance
const cleanupService = new AttendanceCleanupService();

export default cleanupService;
