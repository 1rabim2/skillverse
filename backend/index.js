const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const authMiddleware = require('./middleware/auth');
const Admin = require('./models/Admin');
const Course = require('./models/Course');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

app.get('/api/courses', async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = (req.query.search || '').trim();
    const category = (req.query.category || '').trim();
    const level = (req.query.level || '').trim();
    const skillPath = (req.query.skillPath || '').trim();

    const filter = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    // Student/public browsing should only show published courses.
    // Treat older seeded data (before status existed) as published for demos.
    filter.$and = filter.$and || [];
    filter.$and.push({ $or: [{ status: 'published' }, { status: { $exists: false } }] });
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (skillPath && mongoose.Types.ObjectId.isValid(skillPath)) filter.skillPath = skillPath;

    const [items, total] = await Promise.all([
      Course.find(filter)
        .populate('skillPath', 'title')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Course.countDocuments(filter)
    ]);

    res.json({
      items,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const course = await Course.findById(id).populate('skillPath', 'title description');
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.status && course.status !== 'published') return res.status(404).json({ error: 'Course not found' });

    const raw = course.toObject({ virtuals: true });
    const chapters = Array.isArray(raw.chapters) ? raw.chapters : [];
    const safeChapters = chapters.map((ch) => ({
      ...ch,
      lessons: Array.isArray(ch.lessons)
        ? ch.lessons.map((ls) => {
            const quiz = ls?.quiz || null;
            if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) return ls;
            return {
              ...ls,
              quiz: {
                ...quiz,
                questions: quiz.questions.map((q) => {
                  const { correctIndex, ...rest } = q || {};
                  return rest;
                })
              }
            };
          })
        : []
    }));

    const totalLessons = safeChapters.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0);

    res.json({ course: { ...raw, chapters: safeChapters }, meta: { totalLessons } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'This is protected data', user: req.user });
});

const PORT = process.env.PORT || 4000;
const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skillverse';

async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@skillverse.com';
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  const existing = await Admin.findOne({ email });
  if (existing) return;
  const hash = await bcrypt.hash(password, 10);
  await Admin.create({ name: 'Super Admin', email, password: hash, isActive: true });
  console.log(`Default admin created: ${email}`);
}

async function startServer() {
  async function connect(uri) {
    const connectPromise = mongoose.connect(uri, {
      // Keep local dev responsive when a remote cluster is unreachable.
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000
    });

    const timeoutPromise = new Promise((_, reject) => {
      const t = setTimeout(() => {
        clearTimeout(t);
        reject(new Error('MongoDB connection timed out'));
      }, 4500);
    });

    await Promise.race([connectPromise, timeoutPromise]);
  }

  const localMongo = 'mongodb://127.0.0.1:27017/skillverse';
  const isRemote = /mongodb\+srv:|mongodb:\/\/.*\.mongodb\.net/.test(MONGO);

  try {
    console.log(`Connecting to MongoDB at: ${MONGO}`);
    await connect(MONGO);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn('Initial MongoDB connection failed:', err.message);

    async function startEmbeddedMongo() {
      const dataDir = path.join(__dirname, '..', '.data', 'mongo');
      fs.mkdirSync(dataDir, { recursive: true });

      // Keep mongodb-memory-server binaries inside the project (node_modules cache) so it works
      // in sandboxed environments without user-profile writes.
      const binariesDir = path.join(__dirname, 'node_modules', '.cache', 'mongodb-memory-server');
      fs.mkdirSync(binariesDir, { recursive: true });
      process.env.MONGOMS_DOWNLOAD_DIR = binariesDir;
      process.env.MONGOMS_HOME = binariesDir;
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        instance: { dbPath: dataDir },
        binary: { downloadDir: binariesDir }
      });
      const uri = mongod.getUri();
      await connect(uri);
      console.log(`Connected to embedded MongoDB (data persisted at: ${dataDir})`);
      console.warn('NOTE: This embedded MongoDB is for local development and stores data in .data/mongo.');
    }

    if (isRemote) {
      console.warn('Attempting to connect to local MongoDB instead (mongodb://127.0.0.1:27017/skillverse)');
      try {
        await connect(localMongo);
        console.log('Connected to local MongoDB');
      } catch (localErr) {
        console.warn('Local MongoDB connection failed:', localErr.message);
        console.warn('Falling back to embedded MongoDB for local development');
        try {
          await startEmbeddedMongo();
        } catch (memErr) {
          console.error('Failed to start embedded MongoDB:', memErr.message);
          process.exit(1);
        }
      }
    } else {
      console.warn('Falling back to embedded MongoDB for local development');
      try {
        await startEmbeddedMongo();
      } catch (memErr) {
        console.error('Failed to start embedded MongoDB:', memErr.message);
        process.exit(1);
      }
    }
  }

  await ensureDefaultAdmin();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
