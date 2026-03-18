const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');
const { seedLibrary } = require('../utils/seedLibrary');

dotenv.config();

async function main() {
  const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skillverse';
  const email = process.env.ADMIN_EMAIL || 'admin@skillverse.com';

  try {
    await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
  } catch (err) {
    console.error('Failed to connect to MongoDB. Fix MONGO_URI / Atlas Network Access first.');
    console.error(err.message);
    process.exit(1);
  }

  const admin = await Admin.findOne({ email }).select('_id');
  const result = await seedLibrary({ adminId: admin?._id || null, force: true });
  console.log(JSON.stringify(result, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

