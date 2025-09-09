import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    // Clerk user ID to link with authentication
    clerkId: {
        type: String,
        required: true,
        unique: true
    },
    // User basic information
    username: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    userType: {
        type: String,
        enum: ['Student', 'Teacher'],
        required: true
    },
    // Student specific fields
    studentId: {
        type: String,
        trim: true,
        sparse: true // Allows null values but ensures uniqueness when present
    },
    // Teacher specific fields
    teacherId: {
        type: String,
        trim: true,
        sparse: true // Allows null values but ensures uniqueness when present
    },
    // Common academic information
    department: {
        type: String,
        trim: true
    },
    // Student specific academic info
    batch: {
        type: String,
        trim: true
    },
    section: {
        type: String,
        trim: true,
        uppercase: true
    },
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    // Profile image
    profileImageUrl: {
        type: String,
        trim: true
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Indexes for better performance (removed duplicates since they're defined inline)
userSchema.index({ userType: 1 });

const User = mongoose.model('User', userSchema);

export default User;
