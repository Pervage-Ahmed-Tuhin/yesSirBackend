import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    classroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true
    },
    studentId: {
        type: String,
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    studentEmail: {
        type: String,
        required: true
    },
    photoUrl: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    sessionId: {
        type: String,
        required: true // To track which attendance session this belongs to
    }
});

// Compound index to prevent duplicate submissions in same session
attendanceSchema.index({ classroomId: 1, studentId: 1, sessionId: 1 }, { unique: true });

const attendanceSessionSchema = new mongoose.Schema({
    classroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    },
    duration: {
        type: Number,
        default: 300 // 5 minutes in seconds
    }
});

export const Attendance = mongoose.model('Attendance', attendanceSchema);
export const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);
