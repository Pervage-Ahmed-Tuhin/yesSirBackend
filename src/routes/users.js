import express from 'express';
import User from '../models/User.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';

const router = express.Router();

// Update user profile
router.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { 
            username, 
            studentId, 
            teacherId, 
            department, 
            batch, 
            section,
            userType
        } = req.body;

        console.log('Updating user profile for userId:', userId);
        console.log('Request body:', req.body);

        // Find the user by Clerk ID
        let user = await User.findOne({ clerkId: userId });
        console.log('Found existing user:', user ? 'Yes' : 'No');

        if (!user) {
            // If user doesn't exist, create a new one
            console.log('Creating new user...');
            user = new User({
                clerkId: userId,
                username,
                studentId,
                teacherId,
                department,
                batch,
                section,
                userType: userType || (teacherId ? 'Teacher' : 'Student')
            });
        } else {
            // Update existing user
            console.log('Updating existing user...');
            user.username = username || user.username;
            user.studentId = studentId || user.studentId;
            user.teacherId = teacherId || user.teacherId;
            user.department = department || user.department;
            user.batch = batch || user.batch;
            user.section = section || user.section;
            if (userType) user.userType = userType;
        }

        const savedUser = await user.save();
        console.log('User saved successfully:', savedUser._id);

        // Also update Teacher or Student collection based on userType
        try {
            if (userType === 'Teacher' || user.userType === 'Teacher') {
                console.log('Updating Teacher collection...');
                // First check if teacher exists
                let teacher = await Teacher.findOne({ clerkUserId: userId });
                if (teacher) {
                    // Update existing teacher
                    teacher.name = username || teacher.name;
                    if (teacherId) teacher.teacherId = teacherId;
                    if (department) teacher.department = department;
                    await teacher.save();
                } else {
                    // Create new teacher only if we have all required fields
                    if (username && teacherId && department) {
                        teacher = new Teacher({
                            clerkUserId: userId,
                            name: username,
                            email: user.email || `${username}@temp.edu`, // temporary email if not available
                            teacherId: teacherId,
                            department: department,
                        });
                        await teacher.save();
                    }
                }
                console.log('Teacher collection updated successfully');
            } else if (userType === 'Student' || user.userType === 'Student') {
                console.log('Updating Student collection...');
                // First check if student exists
                let student = await Student.findOne({ clerkUserId: userId });
                if (student) {
                    // Update existing student
                    student.name = username || student.name;
                    if (studentId) student.studentId = studentId;
                    if (department) student.department = department;
                    if (batch) student.batch = batch;
                    if (section) student.section = section;
                    await student.save();
                } else {
                    // Create new student only if we have all required fields
                    if (username && studentId && department && batch && section) {
                        student = new Student({
                            clerkUserId: userId,
                            name: username,
                            email: user.email || `${username}@temp.edu`, // temporary email if not available
                            studentId: studentId,
                            department: department,
                            batch: batch,
                            section: section,
                        });
                        await student.save();
                    }
                }
                console.log('Student collection updated successfully');
            }
        } catch (collectionError) {
            console.warn('Warning: Failed to update Teacher/Student collection:', collectionError.message);
            // Don't fail the main operation if this update fails
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                clerkId: user.clerkId,
                username: user.username,
                studentId: user.studentId,
                teacherId: user.teacherId,
                department: user.department,
                batch: user.batch,
                section: user.section
            }
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

// Get user profile
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findOne({ clerkId: userId });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                clerkId: user.clerkId,
                username: user.username,
                studentId: user.studentId,
                teacherId: user.teacherId,
                department: user.department,
                batch: user.batch,
                section: user.section
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            error: error.message
        });
    }
});

// Get all students
router.get('/list/students', async (req, res) => {
    try {
        const students = await User.find({ userType: 'Student' })
            .select('clerkId username email studentId department batch section createdAt')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            students,
            count: students.length
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message
        });
    }
});

// Get all teachers
router.get('/list/teachers', async (req, res) => {
    try {
        const teachers = await User.find({ userType: 'Teacher' })
            .select('clerkId username email teacherId department createdAt')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            teachers,
            count: teachers.length
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch teachers',
            error: error.message
        });
    }
});

// Get all users
router.get('/list/all', async (req, res) => {
    try {
        const users = await User.find({})
            .select('clerkId username email userType studentId teacherId department batch section createdAt')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            users,
            count: users.length
        });
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
});

export default router;
