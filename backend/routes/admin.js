const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Course = require('../models/Course');
const SkillPath = require('../models/SkillPath');
const Certificate = require('../models/Certificate');
const ActivityLog = require('../models/ActivityLog');
const CommunityPost = require('../models/CommunityPost');
const AdminSetting = require('../models/AdminSetting');
const Notification = require('../models/Notification');
const adminAuth = require('../middleware/adminAuth');
const { seedLibrary } = require('../utils/seedLibrary');
const { notifyAllAdmins, notifyAllStudents } = require('../utils/notifications');

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function emailFilter(email) {
  const normalized = String(email || '').trim();
  if (!normalized) return null;
  return { email: { $regex: `^${escapeRegExp(normalized)}$`, $options: 'i' } };
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

function objectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function activity(type, message) {
  return ActivityLog.create({ type, message }).catch(() => null);
}

router.post('/auth/login', adminAuthLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) return res.status(400).json({ error: 'Email and password required' });
    const admin = await Admin.findOne(emailFilter(normalizedEmail));
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    if (!admin.isActive) return res.status(403).json({ error: 'Admin is deactivated' });
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: admin._id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Google sign-in (login only; does not create admins automatically)
router.post('/auth/google', adminAuthLimiter, async (req, res) => {
  try {
    if (!googleClient) return res.status(500).json({ error: 'Google auth is not configured (missing GOOGLE_CLIENT_ID)' });
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'credential required' });

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload() || {};
    const email = String(payload.email || '').trim().toLowerCase();
    const emailVerified = !!payload.email_verified;
    const googleSub = String(payload.sub || '').trim();

    if (!email) return res.status(400).json({ error: 'Google account has no email' });
    if (!emailVerified) return res.status(403).json({ error: 'Google email is not verified' });
    if (!googleSub) return res.status(400).json({ error: 'Google token missing sub' });

    const admin = await Admin.findOne(emailFilter(email));
    if (!admin) return res.status(403).json({ error: 'Admin account not found for this email' });
    if (!admin.isActive) return res.status(403).json({ error: 'Admin is deactivated' });

    if (admin.googleSub && admin.googleSub !== googleSub) {
      return res.status(409).json({ error: 'This admin email is already linked to a different Google account' });
    }
    if (!admin.googleSub) {
      admin.googleSub = googleSub;
      await admin.save();
    }

    const token = jwt.sign({ id: admin._id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/auth/me', adminAuth, async (req, res) => {
  res.json({ admin: req.admin });
});

router.post('/auth/change-password', adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required' });
    if (String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const admin = await Admin.findById(req.admin._id);
    if (!admin || !admin.isActive) return res.status(403).json({ error: 'Admin not allowed' });

    const match = await bcrypt.compare(String(currentPassword), admin.password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    admin.password = await bcrypt.hash(String(newPassword), 10);
    await admin.save();

    await activity('admin_password_changed', `Admin changed password: ${admin.email}`).catch(() => null);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create another admin (requires existing admin token)
router.post('/admins', adminAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const safeName = String(name || '').trim() || 'Admin';
    if (!normalizedEmail || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await Admin.findOne(emailFilter(normalizedEmail));
    if (existing) return res.status(409).json({ error: 'Admin already exists' });

    const hash = await bcrypt.hash(String(password), 10);
    const admin = await Admin.create({ name: safeName, email: normalizedEmail, password: hash, isActive: true });

    await activity('admin_created', `Admin created: ${admin.email}`).catch(() => null);
    res.status(201).json({ admin: { id: admin._id, name: admin.name, email: admin.email, isActive: admin.isActive } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/dashboard/overview', adminAuth, async (req, res) => {
  try {
    const [users, courses, skillPaths, certificates] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      SkillPath.countDocuments(),
      Certificate.countDocuments()
    ]);

    const monthlyUsersRaw = await User.aggregate([
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthlyCompletionRaw = await Certificate.aggregate([
      {
        $group: {
          _id: { $month: '$issuedAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyUsers = monthNames.map((name, idx) => ({
      month: name,
      count: (monthlyUsersRaw.find((m) => m._id === idx + 1) || {}).count || 0
    }));

    const completionTrends = monthNames.map((name, idx) => ({
      month: name,
      count: (monthlyCompletionRaw.find((m) => m._id === idx + 1) || {}).count || 0
    }));

    const recentActivities = await ActivityLog.find().sort({ createdAt: -1 }).limit(10);
    res.json({
      stats: { users, courses, skillPaths, certificates },
      charts: { monthlyUsers, completionTrends },
      recentActivities
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/courses', adminAuth, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = (req.query.search || '').trim();
    const level = (req.query.level || '').trim();
    const category = (req.query.category || '').trim();
    const status = (req.query.status || '').trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    if (level) filter.level = level;
    if (category) filter.category = category;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Course.find(filter).populate('skillPath', 'title').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Course.countDocuments(filter)
    ]);
    res.json({ items, page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/courses', adminAuth, async (req, res) => {
  try {
    const { title, category, description, level, status, videoUrl, resourceLink, skillPath, thumbnailUrl, chapters } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const created = await Course.create({
      title,
      category,
      description,
      level,
      status: status === 'published' ? 'published' : 'draft',
      videoUrl,
      resourceLink,
      thumbnailUrl,
      chapters: Array.isArray(chapters) ? chapters : [],
      skillPath: objectId(skillPath) ? skillPath : null,
      createdBy: req.admin._id
    });
    await activity('course_created', `Course created: ${created.title}`);

    if (created.status === 'published') {
      notifyAllStudents({
        type: 'info',
        title: 'New course available',
        message: `New course published: ${created.title}`,
        link: `/courses/${created._id}`,
        meta: { courseId: String(created._id) }
      }).catch(() => null);

      notifyAllAdmins({
        type: 'info',
        title: 'Course published',
        message: `Course published: ${created.title}`,
        link: '/admin/courses',
        meta: { courseId: String(created._id) }
      }).catch(() => null);
    }

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/courses/:id', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const item = await Course.findById(req.params.id).populate('skillPath', 'title');
    if (!item) return res.status(404).json({ error: 'Course not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/courses/:id', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const before = await Course.findById(req.params.id).select('title status');
    const data = { ...req.body };
    if (data.skillPath && !objectId(data.skillPath)) data.skillPath = null;
    if (Object.prototype.hasOwnProperty.call(data, 'chapters') && !Array.isArray(data.chapters)) data.chapters = [];
    if (Object.prototype.hasOwnProperty.call(data, 'status')) {
      data.status = data.status === 'published' ? 'published' : 'draft';
    }
    const updated = await Course.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!updated) return res.status(404).json({ error: 'Course not found' });
    await activity('course_updated', `Course updated: ${updated.title}`);

    const wasDraft = before && before.status !== 'published';
    const isNowPublished = updated.status === 'published';
    if (wasDraft && isNowPublished) {
      notifyAllStudents({
        type: 'info',
        title: 'Course published',
        message: `${updated.title} is now published.`,
        link: `/courses/${updated._id}`,
        meta: { courseId: String(updated._id) }
      }).catch(() => null);

      notifyAllAdmins({
        type: 'info',
        title: 'Course published',
        message: `Course published: ${updated.title}`,
        link: '/admin/courses',
        meta: { courseId: String(updated._id) }
      }).catch(() => null);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/courses/:id', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const deleted = await Course.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Course not found' });
    await SkillPath.updateMany({ courses: req.params.id }, { $pull: { courses: req.params.id } });
    await activity('course_deleted', `Course deleted: ${deleted.title}`);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = (req.query.search || '').trim();
    const filter = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {};
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter)
    ]);
    res.json({ items, page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const user = await User.findById(req.params.id)
      .populate('enrolledCourses', 'title category level')
      .populate('progress.course', 'title')
      .populate('certificates.course', 'title');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/users/:id/status', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { isActive } = req.body;
    const updated = await User.findByIdAndUpdate(req.params.id, { isActive: !!isActive }, { new: true });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    await activity('user_status_changed', `${updated.email} is now ${updated.isActive ? 'active' : 'deactivated'}`);

    notifyAllAdmins({
      type: 'warning',
      title: 'User status changed',
      message: `${updated.email} is now ${updated.isActive ? 'active' : 'deactivated'}.`,
      link: '/admin/users',
      meta: { userId: String(updated._id) }
    }).catch(() => null);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/notifications', adminAuth, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 15)));
    const unreadOnly = String(req.query.unread || '') === 'true';
    const filter = {
      recipientType: 'admin',
      recipient: req.admin._id,
      ...(unreadOnly ? { readAt: null } : {})
    };

    const [items, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ recipientType: 'admin', recipient: req.admin._id, readAt: null })
    ]);

    res.json({ items, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

router.patch('/notifications/:id/read', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!objectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipientType: 'admin', recipient: req.admin._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.patch('/notifications/:id/unread', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!objectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipientType: 'admin', recipient: req.admin._id },
      { $set: { readAt: null } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.post('/notifications/read-all', adminAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientType: 'admin', recipient: req.admin._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    await activity('user_deleted', `User deleted: ${deleted.email}`);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/skill-paths', adminAuth, async (req, res) => {
  try {
    const items = await SkillPath.find().populate('courses', 'title category level').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/skill-paths', adminAuth, async (req, res) => {
  try {
    const { title, description, courses = [] } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const validCourses = courses.filter((id) => objectId(id));
    const created = await SkillPath.create({ title, description, courses: validCourses });
    await Course.updateMany({ _id: { $in: validCourses } }, { $set: { skillPath: created._id } });
    await activity('skill_path_created', `Skill path created: ${created.title}`);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/skill-paths/:id', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { title, description, courses } = req.body;
    const update = { title, description };
    if (Array.isArray(courses)) update.courses = courses.filter((id) => objectId(id));
    const updated = await SkillPath.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Skill path not found' });
    if (Array.isArray(courses)) {
      await Course.updateMany({ skillPath: updated._id }, { $set: { skillPath: null } });
      await Course.updateMany({ _id: { $in: updated.courses } }, { $set: { skillPath: updated._id } });
    }
    await activity('skill_path_updated', `Skill path updated: ${updated.title}`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/skill-paths/:id/reorder', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { courses = [] } = req.body;
    const validCourses = courses.filter((id) => objectId(id));
    const updated = await SkillPath.findByIdAndUpdate(req.params.id, { courses: validCourses }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Skill path not found' });
    await Course.updateMany({ skillPath: updated._id }, { $set: { skillPath: null } });
    await Course.updateMany({ _id: { $in: validCourses } }, { $set: { skillPath: updated._id } });
    await activity('skill_path_reordered', `Skill path reordered: ${updated.title}`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/skill-paths/:id', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const deleted = await SkillPath.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Skill path not found' });
    await Course.updateMany({ skillPath: req.params.id }, { $set: { skillPath: null } });
    await activity('skill_path_deleted', `Skill path deleted: ${deleted.title}`);
    res.json({ message: 'Skill path deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/certificates', adminAuth, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = (req.query.search || '').trim();

    const all = await Certificate.find().populate('user', 'name email').populate('course', 'title').sort({ createdAt: -1 });
    const filtered = search
      ? all.filter((item) => {
          const q = search.toLowerCase();
          return (
            (item.certificateId || '').toLowerCase().includes(q) ||
            ((item.user && item.user.name) || '').toLowerCase().includes(q) ||
            ((item.user && item.user.email) || '').toLowerCase().includes(q) ||
            ((item.course && item.course.title) || '').toLowerCase().includes(q)
          );
        })
      : all;

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    res.json({ items, page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/certificates/verify/:certificateId', adminAuth, async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certificateId: req.params.certificateId })
      .populate('user', 'name email')
      .populate('course', 'title');
    if (!cert) return res.status(404).json({ valid: false, message: 'Certificate not found' });
    res.json({ valid: true, certificate: cert });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/community', adminAuth, async (req, res) => {
  try {
    const onlyReported = req.query.reported === 'true';
    const filter = onlyReported ? { $or: [{ reported: true }, { 'comments.reported': true }] } : {};
    const items = await CommunityPost.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/community/:id/approve', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const updated = await CommunityPost.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', reported: false },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Post not found' });
    await activity('community_approved', `Post approved: ${updated._id.toString()}`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/community/:id', adminAuth, async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const deleted = await CommunityPost.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Post not found' });
    await activity('community_deleted', `Post deleted: ${req.params.id}`);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/settings/gamification', adminAuth, async (req, res) => {
  try {
    const setting = await AdminSetting.findOne({ key: 'gamification' });
    const fallback = { xpPerLesson: 10, badgeThreshold: 100, streakDays: 7 };
    res.json(setting ? setting.value : fallback);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings/gamification', adminAuth, async (req, res) => {
  try {
    const value = {
      xpPerLesson: Number(req.body.xpPerLesson || 10),
      badgeThreshold: Number(req.body.badgeThreshold || 100),
      streakDays: Number(req.body.streakDays || 7)
    };
    const saved = await AdminSetting.findOneAndUpdate(
      { key: 'gamification' },
      { key: 'gamification', value },
      { new: true, upsert: true }
    );
    await activity('gamification_updated', 'Gamification settings updated');
    res.json(saved.value);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/settings/localization', adminAuth, async (req, res) => {
  try {
    const setting = await AdminSetting.findOne({ key: 'localization' });
    const fallback = {
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'ne'],
      labels: { en: { welcome: 'Welcome' }, ne: { welcome: 'Swagat cha' } }
    };
    res.json(setting ? setting.value : fallback);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings/localization', adminAuth, async (req, res) => {
  try {
    const value = req.body;
    const saved = await AdminSetting.findOneAndUpdate(
      { key: 'localization' },
      { key: 'localization', value },
      { new: true, upsert: true }
    );
    await activity('localization_updated', 'Localization settings updated');
    res.json(saved.value);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/seed/library', adminAuth, async (req, res) => {
  try {
    const force = !!(req.body && req.body.force);
    const result = await seedLibrary({ adminId: req.admin._id, force });
    await activity('library_seeded', `Course library seeded (force=${force})`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed library' });
  }
});

module.exports = router;
