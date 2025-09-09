import express from "express";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import User from "../models/User.js";

const router = express.Router();

// Register a new student
router.post("/register/student", async (req, res) => {
    try {
        const {
            clerkUserId,
            name,
            email,
            studentId,
            department,
            batch,
            section
        } = req.body;

        // Validate required fields
        if (!clerkUserId || !name || !email || !studentId || !department || !batch || !section) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Check if student already exists
        const existingStudent = await Student.findOne({
            $or: [
                { clerkUserId },
                { email },
                { studentId }
            ]
        });

        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: "Student already exists with this Clerk ID, email, or student ID"
            });
        }

        // Create new student
        const newStudent = new Student({
            clerkUserId,
            name,
            email,
            studentId,
            department,
            batch,
            section
        });

        const savedStudent = await newStudent.save();

        res.status(201).json({
            success: true,
            message: "Student registered successfully",
            data: {
                id: savedStudent._id,
                clerkUserId: savedStudent.clerkUserId,
                name: savedStudent.name,
                email: savedStudent.email,
                studentId: savedStudent.studentId,
                department: savedStudent.department,
                batch: savedStudent.batch,
                section: savedStudent.section
            }
        });

    } catch (error) {
        console.error("Student registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

// Register a new teacher
router.post("/register/teacher", async (req, res) => {
    try {
        const {
            clerkUserId,
            name,
            email,
            teacherId,
            department,
            designation,
            phoneNumber
        } = req.body;

        // Validate required fields
        if (!clerkUserId || !name || !email || !teacherId || !department) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided"
            });
        }

        // Check if teacher already exists
        const existingTeacher = await Teacher.findOne({
            $or: [
                { clerkUserId },
                { email },
                { teacherId }
            ]
        });

        if (existingTeacher) {
            return res.status(400).json({
                success: false,
                message: "Teacher already exists with this Clerk ID, email, or teacher ID"
            });
        }

        // Create new teacher
        const newTeacher = new Teacher({
            clerkUserId,
            name,
            email,
            teacherId,
            department,
            designation: designation || "Assistant Professor",
            phoneNumber
        });

        const savedTeacher = await newTeacher.save();

        res.status(201).json({
            success: true,
            message: "Teacher registered successfully",
            data: {
                id: savedTeacher._id,
                clerkUserId: savedTeacher.clerkUserId,
                name: savedTeacher.name,
                email: savedTeacher.email,
                teacherId: savedTeacher.teacherId,
                department: savedTeacher.department,
                designation: savedTeacher.designation
            }
        });

    } catch (error) {
        console.error("Teacher registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

// Get user profile by Clerk ID
router.get("/profile/:clerkUserId", async (req, res) => {
    try {
        const { clerkUserId } = req.params;

        // Try to find in students first
        let user = await Student.findOne({ clerkUserId });
        let userType = "student";

        // If not found in students, try teachers
        if (!user) {
            user = await Teacher.findOne({ clerkUserId });
            userType = "teacher";
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                userType,
                profile: user
            }
        });

    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

// Update user profile
router.put("/profile/:clerkUserId", async (req, res) => {
    try {
        const { clerkUserId } = req.params;
        const updateData = req.body;

        // Remove fields that shouldn't be updated
        delete updateData.clerkUserId;
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        // Try to find and update in students first
        let user = await Student.findOneAndUpdate(
            { clerkUserId },
            updateData,
            { new: true, runValidators: true }
        );
        let userType = "student";

        // If not found in students, try teachers
        if (!user) {
            user = await Teacher.findOneAndUpdate(
                { clerkUserId },
                updateData,
                { new: true, runValidators: true }
            );
            userType = "teacher";
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                userType,
                profile: user
            }
        });

    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

// Register a new user from Clerk (unified User model)
router.post("/register/from-clerk", async (req, res) => {
    try {
        const {
            clerkId,
            username,
            email,
            userType,
            department,
            studentId,
            teacherId,
            batch,
            section,
            profileImageUrl
        } = req.body;

        console.log('Registering user from Clerk:', {
            clerkId,
            username,
            email,
            userType,
            department
        });

        // Validate required fields
        if (!clerkId || !email || !userType || !department) {
            return res.status(400).json({
                success: false,
                message: "Clerk ID, email, user type, and department are required"
            });
        }

        // Validate user type specific fields
        if (userType === 'Student' && (!studentId || !batch || !section)) {
            return res.status(400).json({
                success: false,
                message: "Student ID, batch, and section are required for students"
            });
        }

        if (userType === 'Teacher' && !teacherId) {
            return res.status(400).json({
                success: false,
                message: "Teacher ID is required for teachers"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { clerkId },
                { email },
                ...(studentId ? [{ studentId }] : []),
                ...(teacherId ? [{ teacherId }] : [])
            ]
        });

        if (existingUser) {
            console.log('User already exists:', existingUser.clerkId);
            return res.status(200).json({
                success: true,
                message: "User already registered",
                user: existingUser,
                isNewUser: false
            });
        }

        // Create new user
        const userData = {
            clerkId,
            username,
            email,
            userType,
            department,
            profileImageUrl,
            isActive: true
        };

        // Add user type specific fields
        if (userType === 'Student') {
            userData.studentId = studentId;
            userData.batch = batch;
            userData.section = section;
        } else if (userType === 'Teacher') {
            userData.teacherId = teacherId;
        }

        const newUser = new User(userData);
        await newUser.save();

        console.log('New user created successfully:', newUser.clerkId);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: newUser._id,
                clerkId: newUser.clerkId,
                username: newUser.username,
                email: newUser.email,
                userType: newUser.userType,
                department: newUser.department,
                studentId: newUser.studentId,
                teacherId: newUser.teacherId,
                batch: newUser.batch,
                section: newUser.section
            },
            isNewUser: true
        });

    } catch (error) {
        console.error("User registration from Clerk error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

export default router;
