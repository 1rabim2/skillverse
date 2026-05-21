/**
 * Database index creation and optimization utilities
 * Run this to ensure all necessary indexes are created
 */

const User = require('../models/User');
const Course = require('../models/Course');
const ChatThread = require('../models/ChatThread');
const Certificate = require('../models/Certificate');
const Notification = require('../models/Notification');
const CommunityPost = require('../models/CommunityPost');
const ProjectSubmission = require('../models/ProjectSubmission');

/**
 * Create all necessary indexes
 */
async function createAllIndexes() {
  try {
    console.log('Creating database indexes...');

    // User indexes
    console.log('Creating User indexes...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ isActive: 1 });
    await User.collection.createIndex({ isVerified: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    await User.collection.createIndex({ enrolledCourses: 1 });
    console.log('✓ User indexes created');

    // Course indexes
    console.log('Creating Course indexes...');
    await Course.collection.createIndex({ instructorId: 1 });
    await Course.collection.createIndex({ status: 1 });
    await Course.collection.createIndex({ category: 1 });
    await Course.collection.createIndex({ level: 1 });
    await Course.collection.createIndex({ createdAt: -1 });
    await Course.collection.createIndex({ title: 'text', description: 'text' }); // Text search
    console.log('✓ Course indexes created');

    // ChatThread indexes
    console.log('Creating ChatThread indexes...');
    await ChatThread.collection.createIndex({ student: 1, course: 1 }, { unique: true });
    await ChatThread.collection.createIndex({ mentor: 1 });
    await ChatThread.collection.createIndex({ lastMessageAt: -1 });
    await ChatThread.collection.createIndex({ createdAt: -1 });
    console.log('✓ ChatThread indexes created');

    // Certificate indexes
    console.log('Creating Certificate indexes...');
    await Certificate.collection.createIndex({ user: 1, course: 1 }, { unique: true });
    await Certificate.collection.createIndex({ issuedAt: -1 });
    await Certificate.collection.createIndex({ certificateId: 1 }, { unique: true });
    console.log('✓ Certificate indexes created');

    // Notification indexes
    console.log('Creating Notification indexes...');
    await Notification.collection.createIndex({ recipient: 1, recipientType: 1 });
    await Notification.collection.createIndex({ readAt: 1 });
    await Notification.collection.createIndex({ createdAt: -1 });
    console.log('✓ Notification indexes created');

    // CommunityPost indexes
    console.log('Creating CommunityPost indexes...');
    await CommunityPost.collection.createIndex({ authorId: 1 });
    await CommunityPost.collection.createIndex({ status: 1 });
    await CommunityPost.collection.createIndex({ createdAt: -1 });
    await CommunityPost.collection.createIndex({ title: 'text', content: 'text' }); // Text search
    console.log('✓ CommunityPost indexes created');

    // ProjectSubmission indexes
    console.log('Creating ProjectSubmission indexes...');
    await ProjectSubmission.collection.createIndex({ student: 1, project: 1 });
    await ProjectSubmission.collection.createIndex({ status: 1 });
    await ProjectSubmission.collection.createIndex({ submittedAt: -1 });
    await ProjectSubmission.collection.createIndex({ reviewedAt: -1 });
    console.log('✓ ProjectSubmission indexes created');

    console.log('\n✅ All indexes created successfully!');
  } catch (err) {
    console.error('Error creating indexes:', err);
    throw err;
  }
}

/**
 * List all indexes
 */
async function listAllIndexes() {
  try {
    const collections = [
      { name: 'User', model: User },
      { name: 'Course', model: Course },
      { name: 'ChatThread', model: ChatThread },
      { name: 'Certificate', model: Certificate },
      { name: 'Notification', model: Notification },
      { name: 'CommunityPost', model: CommunityPost },
      { name: 'ProjectSubmission', model: ProjectSubmission }
    ];

    console.log('\n📊 Database Indexes Report:\n');
    for (const { name, model } of collections) {
      const indexes = await model.collection.getIndexes();
      console.log(`${name}: ${Object.keys(indexes).length} indexes`);
      Object.entries(indexes).forEach(([key, index]) => {
        console.log(`  - ${key}: ${JSON.stringify(index.key)}`);
      });
    }
  } catch (err) {
    console.error('Error listing indexes:', err);
  }
}

/**
 * Drop all custom indexes (keep default _id index)
 */
async function dropAllIndexes() {
  try {
    console.log('Dropping all custom indexes...');

    const collections = [User, Course, ChatThread, Certificate, Notification, CommunityPost, ProjectSubmission];

    for (const model of collections) {
      const indexes = await model.collection.getIndexes();
      for (const [key] of Object.entries(indexes)) {
        if (key !== '_id_') {
          await model.collection.dropIndex(key);
          console.log(`Dropped index: ${key}`);
        }
      }
    }

    console.log('✅ All custom indexes dropped');
  } catch (err) {
    console.error('Error dropping indexes:', err);
  }
}

module.exports = {
  createAllIndexes,
  listAllIndexes,
  dropAllIndexes
};
