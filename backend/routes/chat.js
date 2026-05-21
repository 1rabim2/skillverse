const express = require('express');
const mongoose = require('mongoose');
const ChatThread = require('../models/ChatThread');
const ChatMessage = require('../models/ChatMessage');
const Course = require('../models/Course');
const User = require('../models/User');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function pickText(value, max = 2000) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.length > max) return raw.slice(0, max);
  return raw;
}

async function ensureActiveVerifiedUser(userId) {
  const u = await User.findById(userId).select('_id role isActive isVerified name email avatarUrl headline enrolledCourses');
  if (!u) return { ok: false, status: 404, error: 'User not found' };
  if (!u.isActive) return { ok: false, status: 403, error: 'Account is deactivated' };
  return { ok: true, user: u };
}

async function loadThreadForUser(threadId, userId) {
  const thread = await ChatThread.findById(threadId)
    .populate('course', 'title thumbnailUrl category level')
    .populate('student', 'name email avatarUrl headline')
    .populate('mentor', 'name email avatarUrl headline');
  if (!thread) return { ok: false, status: 404, error: 'Thread not found' };
  const allowed = String(thread.student?._id || thread.student) === String(userId) || String(thread.mentor?._id || thread.mentor) === String(userId);
  if (!allowed) return { ok: false, status: 403, error: 'Not allowed' };
  return { ok: true, thread };
}

// List threads for the current user (student or instructor)
router.get('/threads', requireRole(['student', 'instructor']), async (req, res) => {
  try {
    const who = await ensureActiveVerifiedUser(req.user.id);
    if (!who.ok) return res.status(who.status).json({ error: who.error });

    const role = String(req.user?.role || '').toLowerCase();
    const filter = role === 'instructor' ? { mentor: req.user.id } : { student: req.user.id };

    const items = await ChatThread.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1, createdAt: -1 })
      .limit(200)
      .populate('course', 'title thumbnailUrl category level')
      .populate('student', 'name email avatarUrl headline')
      .populate('mentor', 'name email avatarUrl headline');

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load threads' });
  }
});

// Student: get or create a thread for a course mentor
router.post('/threads', requireRole(['student']), async (req, res) => {
  try {
    const who = await ensureActiveVerifiedUser(req.user.id);
    if (!who.ok) return res.status(who.status).json({ error: who.error });

    const courseId = String(req.body?.courseId || '').trim();
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });

    const course = await Course.findById(courseId).select('_id title instructorId status isApproved createdBy');
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (!course.instructorId) return res.status(400).json({ error: 'This course has no mentor assigned' });

    const enrolled = (who.user.enrolledCourses || []).some((id) => String(id) === String(course._id));
    if (!enrolled) return res.status(400).json({ error: 'You must enroll in this course to chat with the mentor' });

    const mentor = await User.findById(course.instructorId).select('_id role isActive');
    if (!mentor) return res.status(404).json({ error: 'Mentor not found' });
    if (!mentor.isActive) return res.status(403).json({ error: 'Mentor account is deactivated' });
    if (String(mentor.role || '').toLowerCase() !== 'instructor') return res.status(400).json({ error: 'Mentor must be an instructor' });

    const thread = await ChatThread.findOneAndUpdate(
      { course: course._id, student: who.user._id },
      {
        $setOnInsert: {
          course: course._id,
          student: who.user._id,
          mentor: mentor._id,
          lastMessageAt: null,
          lastMessageText: ''
        }
      },
      { new: true, upsert: true }
    )
      .populate('course', 'title thumbnailUrl category level')
      .populate('student', 'name email avatarUrl headline')
      .populate('mentor', 'name email avatarUrl headline');

    res.status(201).json({ thread });
  } catch (err) {
    // Duplicate key on the unique index can happen under concurrent requests.
    if (String(err?.code) === '11000') {
      try {
        const courseId = String(req.body?.courseId || '').trim();
        const existing = await ChatThread.findOne({ course: courseId, student: req.user.id })
          .populate('course', 'title thumbnailUrl category level')
          .populate('student', 'name email avatarUrl headline')
          .populate('mentor', 'name email avatarUrl headline');
        if (existing) return res.json({ thread: existing });
      } catch {
        // ignore
      }
    }
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

router.get('/threads/:id', requireRole(['student', 'instructor']), async (req, res) => {
  try {
    const who = await ensureActiveVerifiedUser(req.user.id);
    if (!who.ok) return res.status(who.status).json({ error: who.error });

    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const loaded = await loadThreadForUser(id, req.user.id);
    if (!loaded.ok) return res.status(loaded.status).json({ error: loaded.error });
    return res.json({ thread: loaded.thread });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load thread' });
  }
});

router.get('/threads/:id/messages', requireRole(['student', 'instructor']), async (req, res) => {
  try {
    const who = await ensureActiveVerifiedUser(req.user.id);
    if (!who.ok) return res.status(who.status).json({ error: who.error });

    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const loaded = await loadThreadForUser(id, req.user.id);
    if (!loaded.ok) return res.status(loaded.status).json({ error: loaded.error });

    const limitRaw = Number(req.query.limit || 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 50;

    const messages = await ChatMessage.find({ thread: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name avatarUrl role');

    // Return ascending for UI convenience.
    res.json({ items: messages.slice().reverse() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

router.post('/threads/:id/messages', requireRole(['student', 'instructor']), async (req, res) => {
  try {
    const who = await ensureActiveVerifiedUser(req.user.id);
    if (!who.ok) return res.status(who.status).json({ error: who.error });

    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const loaded = await loadThreadForUser(id, req.user.id);
    if (!loaded.ok) return res.status(loaded.status).json({ error: loaded.error });

    const text = pickText(req.body?.text, 2000);
    if (!text) return res.status(400).json({ error: 'Message text is required' });

    // Student can only chat in courses they are enrolled in.
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'student') {
      const enrolled = (who.user.enrolledCourses || []).some((cid) => String(cid) === String(loaded.thread.course?._id || loaded.thread.course));
      if (!enrolled) return res.status(400).json({ error: 'You must enroll in this course to chat with the mentor' });
    }

    const msg = await ChatMessage.create({ thread: loaded.thread._id, sender: who.user._id, text });
    loaded.thread.lastMessageAt = msg.createdAt;
    loaded.thread.lastMessageText = text.slice(0, 240);
    await loaded.thread.save();

    const populated = await ChatMessage.findById(msg._id).populate('sender', 'name avatarUrl role');
    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
