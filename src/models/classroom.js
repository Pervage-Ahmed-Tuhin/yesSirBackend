import mongoose from "mongoose";

const classroomSchema = new mongoose.Schema({
    courseName: {
        type: String,
        required: true,
        trim: true
    },
    classCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    teacherId: {
        type: String,
        required: true
    },
    teacherName: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    createdBy: {
        type: String,
        required: true,
        ref: 'User' // Reference to Clerk user ID
    },
    students: [{
        studentId: String,
        studentName: String,
        clerkUserId: String,
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
classroomSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create indexes for better performance
classroomSchema.index({ teacherId: 1 });
classroomSchema.index({ classCode: 1 }, { unique: true });
classroomSchema.index({ createdBy: 1 });

const Classroom = mongoose.model("Classroom", classroomSchema);
export default Classroom;
