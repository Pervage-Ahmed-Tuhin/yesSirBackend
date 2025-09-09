import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
    // Clerk user ID to link with authentication
    clerkUserId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Teacher basic information
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
    // Teacher professional information
    teacherId: {
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
    // Additional teacher information
    designation: {
        type: String,
        default: "Assistant Professor",
        trim: true
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    // Status and permissions
    isActive: {
        type: Boolean,
        default: true
    },
    canCreateClasses: {
        type: Boolean,
        default: true
    },
    // Teaching statistics
    totalClassesConducted: {
        type: Number,
        default: 0
    },
    totalStudentsTeaching: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for better query performance
teacherSchema.index({ department: 1 });

const Teacher = mongoose.model("Teacher", teacherSchema);

export default Teacher;
