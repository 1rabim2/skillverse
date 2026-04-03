const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');

dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET. Create backend/.env (see backend/.env.example) and set JWT_SECRET to a strong random value.');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const communityRoutes = require('./routes/community');
const uploadsAdminRoutes = require('./routes/uploadsAdmin');
const uploadsUserRoutes = require('./routes/uploadsUser');
const paymentsRoutes = require('./routes/payments');
const optionalAuth = require('./middleware/optionalAuth');
const authMiddleware = require('./middleware/auth');
const { csrfProtection, verifyCSRFToken } = require('./middleware/csrf');
const Admin = require('./models/Admin');
const Course = require('./models/Course');
const SkillPath = require('./models/SkillPath');
const User = require('./models/User');
const { isSubscriptionActive, sanitizeCourseForNonSubscriber } = require('./utils/subscription');
const { notifyUser } = require('./utils/notifications');
const { sendEmail } = require('./utils/email');

const app = express();

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function withLocalhostVariants(origin) {
  const list = new Set();
  const o = normalizeOrigin(origin);
  if (!o) return list;
  list.add(o);
  try {
    const u = new URL(o);
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
      list.add(normalizeOrigin(u.toString()));
    } else if (u.hostname === '127.0.0.1') {
      u.hostname = 'localhost';
      list.add(normalizeOrigin(u.toString()));
    }
  } catch {
    // ignore
  }
  return list;
}

// Security: CORS configuration - only allow known frontend origins (with helpful dev defaults)
const allowedOriginSet = new Set([
  ...withLocalhostVariants(process.env.FRONTEND_URL || 'http://localhost:5173'),
  ...withLocalhostVariants(process.env.ADMIN_URL || process.env.FRONTEND_URL || 'http://localhost:5173'),
  ...withLocalhostVariants('http://localhost:4000'),
  ...withLocalhostVariants('http://localhost:3000')
]);

app.use(cors({
  origin(origin, cb) {
    const o = normalizeOrigin(origin);
    if (!o) return cb(null, true); // same-origin or non-browser clients
    if (allowedOriginSet.has(o)) return cb(null, true);

    // Dev friendliness: allow any localhost/127.0.0.1 port during development.
    if (process.env.NODE_ENV !== 'production') {
      try {
        const u = new URL(o);
        if (['http:', 'https:'].includes(u.protocol) && ['localhost', '127.0.0.1'].includes(u.hostname)) {
          return cb(null, true);
        }
      } catch {
        // ignore
      }
    }

    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Security: Helmet for HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(express.json());
app.use(cookieParser());

// Public static uploads (images/videos) stored under .data/uploads
app.use('/uploads', express.static(path.join(__dirname, '..', '.data', 'uploads'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  fallthrough: false
}));

// CSRF protection - apply to all requests
app.use(csrfProtection);

// Get CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({ token: req.csrfToken });
});

// Apply CSRF verification to all state-changing routes
app.use((req, res, next) => {
  verifyCSRFToken(req, res, next);
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/uploads', uploadsAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user/uploads', authMiddleware, uploadsUserRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/payments', authMiddleware, paymentsRoutes);
app.use('/api/community', communityRoutes);

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

app.get('/api/courses/:id', optionalAuth, async (req, res) => {
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

    const payload = { ...raw, chapters: safeChapters };

    let allowVideos = false;
    if (req.user?.id) {
      const u = await User.findById(req.user.id).select('subscription isActive isVerified role');
      if (u && u.isActive && u.isVerified && u.role === 'student' && isSubscriptionActive(u)) allowVideos = true;
    }

    const courseOut = allowVideos ? payload : sanitizeCourseForNonSubscriber(payload);
    res.json({ course: courseOut, meta: { totalLessons, videosLocked: !allowVideos } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

app.get('/api/skill-paths', async (req, res) => {
  try {
    const items = await SkillPath.find()
      .sort({ createdAt: -1 })
      .populate('courses', 'title category level status thumbnailUrl skillPath');

    const safe = (items || []).map((path) => {
      const raw = path.toObject({ virtuals: true });
      const courses = Array.isArray(raw.courses) ? raw.courses : [];
      const publishedCourses = courses.filter((c) => !c?.status || c.status === 'published');
      return { ...raw, courses: publishedCourses };
    });

    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skill paths' });
  }
});

app.get('/api/skill-paths/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });

    const item = await SkillPath.findById(id).populate('courses', 'title category level status thumbnailUrl skillPath');
    if (!item) return res.status(404).json({ error: 'Skill path not found' });

    const raw = item.toObject({ virtuals: true });
    const courses = Array.isArray(raw.courses) ? raw.courses : [];
    const publishedCourses = courses.filter((c) => !c?.status || c.status === 'published');

    res.json({ ...raw, courses: publishedCourses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skill path' });
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
  const disableEmbeddedMongo = ['1', 'true', 'yes', 'y', 'on'].includes(
    String(process.env.DISABLE_EMBEDDED_MONGO || '').trim().toLowerCase()
  );

  async function connect(uri) {
    // If a previous connect attempt is still "active" (connecting/connected),
    // reset before trying a different connection string.
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch {
        // ignore
      }
    }

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

    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }

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
        if (disableEmbeddedMongo) {
          console.error('Embedded MongoDB is disabled (DISABLE_EMBEDDED_MONGO=true).');
          console.error('Start a local MongoDB on 127.0.0.1:27017 or set MONGO_URI to a reachable MongoDB instance.');
          process.exit(1);
        }

        console.warn('Falling back to embedded MongoDB for local development');
        try {
          await startEmbeddedMongo();
        } catch (memErr) {
          console.error('Failed to start embedded MongoDB:', memErr.message);
          console.error('Tip: set DISABLE_EMBEDDED_MONGO=true and use a local MongoDB (127.0.0.1:27017) or Atlas.');
          process.exit(1);
        }
      }
    } else {
      if (disableEmbeddedMongo) {
        console.error('Embedded MongoDB is disabled (DISABLE_EMBEDDED_MONGO=true).');
        console.error('Start a local MongoDB on 127.0.0.1:27017 or set MONGO_URI to a reachable MongoDB instance.');
        process.exit(1);
      }

      console.warn('Falling back to embedded MongoDB for local development');
      try {
        await startEmbeddedMongo();
      } catch (memErr) {
        console.error('Failed to start embedded MongoDB:', memErr.message);
        console.error('Tip: set DISABLE_EMBEDDED_MONGO=true and use a local MongoDB (127.0.0.1:27017) or Atlas.');
        process.exit(1);
      }
    }
  }

  await ensureDefaultAdmin();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // Subscription reminders (email + in-app notifications)
  const remindersEnabled = !['0', 'false', 'no', 'off'].includes(String(process.env.SUBSCRIPTION_REMINDERS_ENABLED || '').trim().toLowerCase());
  if (remindersEnabled) {
    const reminderDays = Math.max(1, Math.min(14, Number(process.env.SUBSCRIPTION_REMINDER_DAYS || 3)));
    const intervalHours = Math.max(3, Math.min(48, Number(process.env.SUBSCRIPTION_REMINDER_INTERVAL_HOURS || 12)));
    const frontend = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

    async function runReminderSweep() {
      const now = new Date();
      const maxBatch = 250;
      try {
        const users = await User.find({
          role: 'student',
          isActive: true,
          isVerified: true,
          'subscription.status': 'active',
          'subscription.currentPeriodEnd': { $ne: null }
        })
          .select('email subscription')
          .sort({ 'subscription.currentPeriodEnd': 1 })
          .limit(maxBatch);

        for (const u of users) {
          const end = u.subscription?.currentPeriodEnd ? new Date(u.subscription.currentPeriodEnd) : null;
          if (!end || Number.isNaN(end.getTime())) continue;

          const msLeft = end.getTime() - now.getTime();
          const daysLeft = msLeft / (24 * 60 * 60 * 1000);

          if (msLeft <= 0) {
            const last = u.subscription?.lastExpiredNoticeAt ? new Date(u.subscription.lastExpiredNoticeAt) : null;
            if (last && now.getTime() - last.getTime() < 20 * 60 * 60 * 1000) continue;
            u.subscription.lastExpiredNoticeAt = now;
            await u.save().catch(() => null);

            notifyUser(u._id, {
              type: 'warning',
              title: 'Subscription expired',
              message: 'Your subscription has expired. Renew to unlock hosted course videos.',
              link: '/subscribe'
            }).catch(() => null);

            sendEmail({
              to: u.email,
              subject: 'Your Skillverse subscription expired',
              text: `Your subscription has expired. Renew here: ${frontend}/subscribe`,
              html: `<p>Your subscription has expired.</p><p>Renew here: <a href="${frontend}/subscribe">${frontend}/subscribe</a></p>`
            }).catch(() => null);
            continue;
          }

          if (daysLeft <= reminderDays) {
            const last = u.subscription?.lastReminderAt ? new Date(u.subscription.lastReminderAt) : null;
            if (last && now.getTime() - last.getTime() < 20 * 60 * 60 * 1000) continue;
            u.subscription.lastReminderAt = now;
            await u.save().catch(() => null);

            const endText = end.toLocaleDateString();
            notifyUser(u._id, {
              type: 'info',
              title: 'Subscription expiring soon',
              message: `Your subscription expires on ${endText}. Renew to keep access.`,
              link: '/subscribe'
            }).catch(() => null);

            sendEmail({
              to: u.email,
              subject: 'Your Skillverse subscription is expiring soon',
              text: `Your subscription expires on ${endText}. Renew here: ${frontend}/subscribe`,
              html: `<p>Your subscription expires on <b>${endText}</b>.</p><p>Renew here: <a href="${frontend}/subscribe">${frontend}/subscribe</a></p>`
            }).catch(() => null);
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.warn('Subscription reminder sweep failed:', err?.message || String(err));
      }
    }

    setTimeout(() => runReminderSweep().catch(() => null), 15000);
    setInterval(() => runReminderSweep().catch(() => null), intervalHours * 60 * 60 * 1000);
  }
}

startServer();
