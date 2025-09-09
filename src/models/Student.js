import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
    // Clerk user ID to link with authentication
    clerkUserId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Student basic information
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    // Student academic information
    studentId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    batch: {
        type: String,
        required: true,
        trim: true
    },
    section: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    // Additional fields
    isActive: {
        type: Boolean,
        default: true
    },
    // Attendance tracking
    totalClasses: {
        type: Number,
        default: 0
    },
    attendedClasses: {
        type: Number,
        default: 0
    },
    attendancePercentage: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Calculate attendance percentage before saving
studentSchema.pre('save', function(next) {
    if (this.totalClasses > 0) {
        this.attendancePercentage = Math.round((this.attendedClasses / this.totalClasses) * 100);
    } else {
        this.attendancePercentage = 0;
    }
    next();
});

// Compound index for better query performance
studentSchema.index({ department: 1, batch: 1, section: 1 });

const Student = mongoose.model("Student", studentSchema);

export default Student;
