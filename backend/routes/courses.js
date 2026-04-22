const express = require('express');
const mongoose = require('mongoose');
const Course = require('../models/Course');
const User = require('../models/User');
const SkillPath = require('../models/SkillPath');
const ProjectSubmission = require('../models/ProjectSubmission');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function pickString(value, max = 5000) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if (v.length > max) return v.slice(0, max);
  return v;
}

// Instructor: list own courses
router.get('/mine', authMiddleware, requireRole('instructor'), async (req, res) => {
  try {
    const items = await Course.find({ instructorId: req.user.id }).sort({ updatedAt: -1, createdAt: -1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Instructor: view enrolled students + progress
router.get('/:id/students', authMiddleware, requireRole('instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const course = await Course.findById(id).select('_id instructorId title');
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (String(course.instructorId || '') !== String(req.user.id || '')) return res.status(403).json({ error: 'Not allowed' });

    const users = await User.find({ enrolledCourses: course._id })
      .select('name email progress enrolledCourses')
      .limit(500);

    const items = users.map((u) => {
      const entry = (u.progress || []).find((p) => p?.course && String(p.course) === String(course._id));
      return {
        id: u._id,
        name: u.name || 'Student',
        email: u.email,
        percent: entry?.percent ?? 0,
        completedAt: entry?.completedAt ?? null
      };
    });

    res.json({ course: { id: course._id, title: course.title }, items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load students' });
  }
});

// Admin: list all courses for analytics & tracking
router.get('/pending', authMiddleware, requireRole('admin'), async (_req, res) => {
  try {
    const items = await Course.find({ isApproved: false, createdBy: null })
      .populate('instructorId', 'name email')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Instructor: create course draft (admin approval required to publish)
router.post('/', authMiddleware, requireRole('instructor'), async (req, res) => {
  try {
    const title = pickString(req.body?.title, 200);
    const description = pickString(req.body?.description, 5000);
    const category = pickString(req.body?.category, 100) || 'General';
    const level = pickString(req.body?.level, 20) || 'Beginner';
    const skillPath = req.body?.skillPath || null;
    const thumbnailUrl = pickString(req.body?.thumbnailUrl, 1000);

    if (!title) return res.status(400).json({ error: 'title is required' });

    const doc = await Course.create({
      title,
      description,
      category,
      level,
      status: 'draft',
      isApproved: false,
      approvalRequestedAt: null,
      approvedAt: null,
      approvedBy: null,
      instructorId: req.user.id,
      skillPath: isObjectId(skillPath) ? skillPath : null,
      thumbnailUrl
    });

    res.status(201).json({ course: doc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Instructor: update own course (cannot self-approve/publish)
router.put('/:id', authMiddleware, requireRole('instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (String(course.instructorId || '') !== String(req.user.id || '')) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const next = req.body || {};
    if (typeof next.title !== 'undefined') course.title = pickString(next.title, 200) || course.title;
    if (typeof next.description !== 'undefined') course.description = pickString(next.description, 5000);
    if (typeof next.category !== 'undefined') course.category = pickString(next.category, 100) || course.category;
    if (typeof next.level !== 'undefined') course.level = pickString(next.level, 20) || course.level;
    if (typeof next.thumbnailUrl !== 'undefined') course.thumbnailUrl = pickString(next.thumbnailUrl, 1000);
    if (typeof next.videoUrl !== 'undefined') course.videoUrl = pickString(next.videoUrl, 1000);
    if (typeof next.resourceLink !== 'undefined') course.resourceLink = pickString(next.resourceLink, 1000);
    if (typeof next.skillPath !== 'undefined') course.skillPath = isObjectId(next.skillPath) ? next.skillPath : null;

    // Chapters/lessons/quizzes are embedded. Instructors can update them wholesale.
    if (Array.isArray(next.chapters)) course.chapters = next.chapters;

    // If an instructor edits an approved/published course, it becomes a draft again and must be re-approved.
    if (course.status === 'published' || course.isApproved === true) {
      course.status = 'draft';
      course.isApproved = false;
      course.approvalRequestedAt = null;
      course.approvedAt = null;
      course.approvedBy = null;
    }

    await course.save();
    res.json({ course });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Instructor: request admin approval (flags draft + notifies admins)
router.post('/:id/request-approval', authMiddleware, requireRole('instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const course = await Course.findById(id).select('_id title instructorId status isApproved approvalRequestedAt createdBy');
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (String(course.instructorId || '') !== String(req.user.id || '')) return res.status(403).json({ error: 'Not allowed' });
    if (course.createdBy) return res.status(400).json({ error: 'Admin-created courses do not require approval requests' });
    if (course.isApproved) return res.status(400).json({ error: 'Course is already approved' });

    course.status = 'draft';
    course.isApproved = false;
    course.approvalRequestedAt = new Date();
    await course.save();

    // Lazy-load to avoid adding weight to the common course routes.
    const { notifyAllAdmins } = require('../utils/notifications');
    notifyAllAdmins({
      type: 'info',
      title: 'Course approval requested',
      message: `Instructor requested approval for: ${course.title}`,
      link: '/admin/courses',
      meta: { courseId: String(course._id) }
    }).catch(() => null);

    res.json({ ok: true, course: { id: course._id, approvalRequestedAt: course.approvalRequestedAt } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request approval' });
  }
});

// Admin: hide/flag course (moderation endpoint)
router.patch('/:id/approve', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Admin can toggle course visibility for moderation
    const flag = req.body?.flag || 'published';
    const nextStatus = flag === 'hide' ? 'draft' : 'published';
    course.status = nextStatus;
    if (nextStatus === 'published') {
      course.isApproved = true;
      course.approvedAt = new Date();
      course.approvalRequestedAt = null;
    }
    await course.save();
    res.json({ course });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Admin: delete any course; Instructor: delete own unpublished course
router.delete('/:id', authMiddleware, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const role = String(req.user?.role || '').toLowerCase();
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (role === 'instructor') {
      if (String(course.instructorId || '') !== String(req.user.id || '')) return res.status(403).json({ error: 'Not allowed' });
      if (String(course.status || '') === 'published') {
        return res.status(400).json({ error: 'Published courses cannot be deleted by instructors. Unpublish it first.' });
      }
    }

    await Course.deleteOne({ _id: course._id });
    await SkillPath.updateMany({ courses: course._id }, { $pull: { courses: course._id } });
    await User.updateMany({ enrolledCourses: course._id }, { $pull: { enrolledCourses: course._id } });
    await User.updateMany({ 'progress.course': course._id }, { $pull: { progress: { course: course._id } } });
    await ProjectSubmission.deleteMany({ course: course._id });

    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

module.exports = router;
