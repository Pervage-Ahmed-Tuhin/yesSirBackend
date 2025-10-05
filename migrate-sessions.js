// Migration script to clean up old attendance sessions without expiresAt field
// Run this ONCE before deploying the timer fix to production

const mongoose = require('mongoose');
require('dotenv').config();

async function migrateOldSessions() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const AttendanceSession = mongoose.model('AttendanceSession');

        // Find all sessions without expiresAt field
        const oldSessions = await AttendanceSession.find({
            expiresAt: { $exists: false }
        });

        console.log(`\n📊 Found ${oldSessions.length} sessions without expiresAt field`);

        if (oldSessions.length === 0) {
            console.log('✅ No migration needed - all sessions have expiresAt field');
            return;
        }

        // Option 1: Delete all old sessions (RECOMMENDED)
        console.log('\n🗑️  Deleting old sessions...');
        const deleteResult = await AttendanceSession.deleteMany({
            expiresAt: { $exists: false }
        });
        console.log(`✅ Deleted ${deleteResult.deletedCount} old sessions`);

        // Option 2: Update old sessions with computed expiresAt (ALTERNATIVE)
        // Uncomment if you prefer to keep old session data
        /*
        console.log('\n🔄 Updating old sessions with computed expiresAt...');
        let updated = 0;
        for (const session of oldSessions) {
            const durationMs = (session.duration || 300) * 1000; // default 5 min
            const expiresAt = new Date(session.startedAt.getTime() + durationMs);
            
            await AttendanceSession.updateOne(
                { _id: session._id },
                { $set: { expiresAt } }
            );
            updated++;
        }
        console.log(`✅ Updated ${updated} sessions with expiresAt field`);
        */

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Run migration
migrateOldSessions()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
