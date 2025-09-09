import express from "express";
import Classroom from "../models/classroom.js";

const router = express.Router();

// Create a new classroom
router.post("/create", async (req, res) => {
    try {
        const { courseName, classCode, teacherId, teacherName, department, createdBy } = req.body;

        // Validate required fields
        if (!courseName || !classCode || !teacherId || !teacherName || !department || !createdBy) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Check if class code already exists
        const existingClassroom = await Classroom.findOne({ 
            classCode: classCode.toUpperCase() 
        });

        if (existingClassroom) {
            return res.status(400).json({
                success: false,
                message: "Class code already exists. Please choose a different code."
            });
        }

        // Create new classroom
        const classroom = new Classroom({
            courseName: courseName.trim(),
            classCode: classCode.toUpperCase().trim(),
            teacherId,
            teacherName,
            department,
            createdBy
        });

        await classroom.save();

        console.log("Classroom created successfully:", classroom);

        res.status(201).json({
            success: true,
            message: "Classroom created successfully",
            classroom: {
                id: classroom._id,
                courseName: classroom.courseName,
                classCode: classroom.classCode,
                teacherName: classroom.teacherName,
                department: classroom.department,
                createdAt: classroom.createdAt
            }
        });

    } catch (error) {
        console.error("Create classroom error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Get classrooms by teacher Clerk ID
router.get("/teacher/:teacherClerkId", async (req, res) => {
    try {
        const { teacherClerkId } = req.params;
        console.log('Fetching classrooms for teacher Clerk ID:', teacherClerkId);

        const classrooms = await Classroom.find({ 
            createdBy: teacherClerkId,
            isActive: true 
        }).sort({ createdAt: -1 });

        console.log(`Found ${classrooms.length} classrooms for teacher ${teacherClerkId}`);

        res.status(200).json({
            success: true,
            classrooms
        });

    } catch (error) {
        console.error("Get teacher classrooms error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Get classroom by class code
router.get("/code/:classCode", async (req, res) => {
    try {
        const { classCode } = req.params;

        const classroom = await Classroom.findOne({ 
            classCode: classCode.toUpperCase(),
            isActive: true 
        });

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: "Classroom not found"
            });
        }

        res.status(200).json({
            success: true,
            classroom
        });

    } catch (error) {
        console.error("Get classroom by code error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Join classroom (for students)
router.post("/join", async (req, res) => {
    try {
        const { classCode, studentId, studentName, clerkUserId } = req.body;

        // Validate required fields
        if (!classCode || !studentId || !studentName || !clerkUserId) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Find classroom
        const classroom = await Classroom.findOne({ 
            classCode: classCode.toUpperCase(),
            isActive: true 
        });

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: "Classroom not found"
            });
        }

        // Check if student is already in the classroom
        const isAlreadyEnrolled = classroom.students.some(
            student => student.studentId === studentId || student.clerkUserId === clerkUserId
        );

        if (isAlreadyEnrolled) {
            return res.status(400).json({
                success: false,
                message: "You are already enrolled in this classroom"
            });
        }

        // Add student to classroom
        classroom.students.push({
            studentId,
            studentName,
            clerkUserId,
            joinedAt: new Date()
        });

        await classroom.save();

        res.status(200).json({
            success: true,
            message: "Successfully joined the classroom",
            classroom: {
                id: classroom._id,
                courseName: classroom.courseName,
                classCode: classroom.classCode,
                teacherName: classroom.teacherName
            }
        });

    } catch (error) {
        console.error("Join classroom error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Delete a classroom
router.delete("/:classroomId", async (req, res) => {
    try {
        const { classroomId } = req.params;

        // Find and delete the classroom
        const deletedClassroom = await Classroom.findByIdAndDelete(classroomId);

        if (!deletedClassroom) {
            return res.status(404).json({
                success: false,
                message: "Classroom not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Classroom deleted successfully",
            classroom: deletedClassroom
        });

    } catch (error) {
        console.error("Delete classroom error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Update teacher information in all classrooms they own
router.put("/update-teacher", async (req, res) => {
    try {
        const { teacherClerkId, newTeacherName, newTeacherId, newDepartment } = req.body;

        if (!teacherClerkId) {
            return res.status(400).json({
                success: false,
                message: "Teacher Clerk ID is required"
            });
        }

        // Update all classrooms where this teacher is the creator
        const updateResult = await Classroom.updateMany(
            { createdBy: teacherClerkId },
            {
                $set: {
                    ...(newTeacherName && { teacherName: newTeacherName }),
                    ...(newTeacherId && { teacherId: newTeacherId }),
                    ...(newDepartment && { department: newDepartment })
                }
            }
        );

        console.log(`Updated ${updateResult.modifiedCount} classrooms for teacher ${teacherClerkId}`);

        res.status(200).json({
            success: true,
            message: `Updated ${updateResult.modifiedCount} classroom(s)`,
            modifiedCount: updateResult.modifiedCount
        });

    } catch (error) {
        console.error("Update teacher classrooms error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Update student information in all classrooms they're enrolled in
router.put("/update-student", async (req, res) => {
    try {
        const { userId, newUsername, newStudentId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        // Find all classrooms where this student is enrolled
        const classrooms = await Classroom.find({
            "students.clerkUserId": userId
        });

        let totalUpdated = 0;

        // Update student information in each classroom
        for (const classroom of classrooms) {
            const studentIndex = classroom.students.findIndex(student => student.clerkUserId === userId);
            
            if (studentIndex !== -1) {
                // Update the student's information
                if (newUsername) classroom.students[studentIndex].studentName = newUsername;
                if (newStudentId) classroom.students[studentIndex].studentId = newStudentId;
                
                await classroom.save();
                totalUpdated++;
            }
        }

        console.log(`Updated student info in ${totalUpdated} classrooms for user ${userId}`);

        res.status(200).json({
            success: true,
            message: `Updated student information in ${totalUpdated} classroom(s)`,
            modifiedCount: totalUpdated
        });

    } catch (error) {
        console.error("Update student classrooms error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

export default router;
