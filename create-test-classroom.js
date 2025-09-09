// Test file for creating classroom
import { connectDB } from '../lib/db.js';
import Classroom from './src/models/classroom.js';

const createTestClassroom = async () => {
    try {
        await connectDB();
        
        const testClassroom = new Classroom({
            courseName: 'Test Course',
            classCode: 'TEST01',
            teacherId: 'test123',
            teacherName: 'Test Teacher',
            department: 'Computer Science',
            createdBy: 'test_user_id'
        });
        
        await testClassroom.save();
        console.log('Test classroom created:', testClassroom);
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating test classroom:', error);
        process.exit(1);
    }
};

createTestClassroom();
