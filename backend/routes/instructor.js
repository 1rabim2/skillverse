const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const Course = require('../models/Course');
const ProjectSubmission = require('../models/ProjectSubmission');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { attachmentPath } = require('../utils/projectUploads');
const { notifyUser } = require('../utils/notifications');
const { sendEmail } = require('../utils/email');

const router = express.Router();

function objectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function loadInstructorCourseIds(instructorId) {
  const courses = await Course.find({ instructorId }).select('_id').limit(2000);
  return courses.map((c) => c._id);
}

function safeString(value, max = 5000) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if (v.length > max) return v.slice(0, max);
  return v;
}

function isCoursePubliclyVisible(course) {
  if (!course) return false;
  const status = String(course.status || '').trim();
  if (status && status !== 'published') return false;
  // Admin-created courses are always visible; instructor-created must be approved.
  if (course.createdBy) return true;
  if (course.isApproved === true) return true;
  if (typeof course.isApproved === 'undefined') return true; // seeded/legacy
  return false;
}

// Instructor: browse platform library courses (admin-created or legacy seeded)
router.get('/library-courses', authMiddleware, requireRole('instructor'), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const search = String(req.query.search || '').trim();

    const filter = {
      $and: [
        { $or: [{ status: 'published' }, { status: { $exists: false } }] },
        {
          $or: [
            { createdBy: { $exists: true, $ne: null } }, // admin course
            { isApproved: true }, // approved course
            { isApproved: { $exists: false } } // legacy/seeded
          ]
        },
        // Library = not owned by any instructor (admin/seeded content)
        { $or: [{ instructorId: null }, { instructorId: { $exists: false } }] }
      ]
    };

    if (search) {
      filter.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const [items, total] = await Promise.all([
      Course.find(filter).populate('skillPath', 'title').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Course.countDocuments(filter)
    ]);

    res.json({ items, page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load library courses' });
  }
});

// Instructor: clone a library course into their own draft (requires admin approval to publish)
router.post('/library-courses/:id/clone', authMiddleware, requireRole('instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!objectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const source = await Course.findById(id);
    if (!source) return res.status(404).json({ error: 'Course not found' });
    if (source.instructorId) return res.status(400).json({ error: 'This course is not in the library' });
    if (!isCoursePubliclyVisible(source)) return res.status(404).json({ error: 'Course not found' });

    const now = new Date();
    const cloned = await Course.create({
      title: safeString(source.title, 200) ? `${safeString(source.title, 200)} (Copy)` : 'Course (Copy)',
      description: safeString(source.description, 5000),
      category: safeString(source.category, 100) || 'General',
      level: safeString(source.level, 20) || 'Beginner',
      thumbnailUrl: safeString(source.thumbnailUrl, 1000),
      videoUrl: safeString(source.videoUrl, 1000),
      resourceLink: safeString(source.resourceLink, 1000),
      chapters: Array.isArray(source.chapters) ? source.chapters : [],
      skillPath: source.skillPath && objectId(source.skillPath) ? source.skillPath : null,

      // Ownership / approval model
      instructorId: req.user.id,
      createdBy: null,
      status: 'draft',
      isApproved: false,
      approvalRequestedAt: null,
      approvedAt: null,
      approvedBy: null,

      // Keep timestamps predictable for sorting
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json({ course: cloned });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clone course' });
  }
});

router.get('/project-submissions', authMiddleware, requireRole('instructor'), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const status = String(req.query.status || '').trim();
    const courseId = String(req.query.courseId || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();

    const courseIds = await loadInstructorCourseIds(req.user.id);
    if (courseIds.length === 0) return res.json({ items: [], page, totalPages: 1, total: 0 });

    const filter = { course: { $in: courseIds } };
    if (status) filter.status = status;
    if (courseId && objectId(courseId)) filter.course = courseId;

    const all = await ProjectSubmission.find(filter)
      .populate('user', 'name email')
      .populate('course', 'title category level instructorId')
      .populate('reviewedBy', 'name email')
      .populate('reviewedByInstructor', 'name email')
      .sort({ updatedAt: -1 })
      .exec();

    const filtered = search
      ? all.filter((x) => {
          const u = x.user || {};
          const c = x.course || {};
          return (
            String(u.email || '').toLowerCase().includes(search) ||
            String(u.name || '').toLowerCase().includes(search) ||
            String(c.title || '').toLowerCase().includes(search) ||
            String(x.lessonTitle || '').toLowerCase().includes(search)
          );
        })
      : all;

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit).map((s) => ({
      id: s._id,
      status: s.status,
      lessonId: s.lessonId,
      lessonTitle: s.lessonTitle,
      repoUrl: s.repoUrl,
      demoUrl: s.demoUrl,
      notes: s.notes,
      feedback: s.feedback,
      submittedAt: s.submittedAt,
      reviewedAt: s.reviewedAt,
      updatedAt: s.updatedAt,
      attachmentCount: Array.isArray(s.attachments) ? s.attachments.length : 0,
      user: s.user ? { id: s.user._id, name: s.user.name, email: s.user.email } : null,
      course: s.course ? { id: s.course._id, title: s.course.title, category: s.course.category, level: s.course.level } : null,
      reviewedByInstructor: s.reviewedByInstructor
        ? { id: s.reviewedByInstructor._id, name: s.reviewedByInstructor.name, email: s.reviewedByInstructor.email }
        : null,
      reviewedByAdmin: s.reviewedBy ? { id: s.reviewedBy._id, name: s.reviewedBy.name, email: s.reviewedBy.email } : null
    }));

    res.json({ items, page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load submissions' });
  }
});

router.get(
  '/project-submissions/:id/attachments/:fileName',
  authMiddleware,
  requireRole('instructor'),
  async (req, res) => {
    try {
      const { id, fileName } = req.params;
      if (!objectId(id)) return res.status(400).json({ error: 'Invalid id' });

      const submission = await ProjectSubmission.findById(id).select('attachments course').populate('course', 'instructorId');
      if (!submission) return res.status(404).json({ error: 'Submission not found' });
      if (String(submission.course?.instructorId || '') !== String(req.user.id || '')) return res.status(403).json({ error: 'Not allowed' });

      const att = (submission.attachments || []).find((a) => String(a.fileName) === String(fileName));
      if (!att) return res.status(404).json({ error: 'Attachment not found' });

      const p = attachmentPath({ submissionId: submission._id, fileName: att.fileName });
      if (!p || !fs.existsSync(p)) return res.status(404).json({ error: 'File missing' });
      res.setHeader('Content-Type', att.mime || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${att.originalName || att.fileName}"`);
      fs.createReadStream(p).pipe(res);
    } catch (err) {
      res.status(500).json({ error: 'Failed to download attachment' });
    }
  }
);

router.patch('/project-submissions/:id', authMiddleware, requireRole('instructor'), async (req, res) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { status, feedback } = req.body || {};

    const before = await ProjectSubmission.findById(req.params.id)
      .select('status feedback user course lessonId lessonTitle')
      .populate('course', 'instructorId title');
    if (!before) return res.status(404).json({ error: 'Submission not found' });
    if (String(before.course?.instructorId || '') !== String(req.user.id || '')) return res.status(403).json({ error: 'Not allowed' });

    const update = {};
    if (status && ['draft', 'submitted', 'needs_changes', 'approved'].includes(String(status))) update.status = String(status);
    if (typeof feedback !== 'undefined') update.feedback = String(feedback ?? '').slice(0, 6000);
    update.reviewedAt = new Date();
    update.reviewedByInstructor = req.user.id;

    const updated = await ProjectSubmission.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
      .populate('user', 'name email')
      .populate('course', 'title category level instructorId')
      .populate('reviewedByInstructor', 'name email');

    if (!updated) return res.status(404).json({ error: 'Submission not found' });

    const statusChanged = update.status && String(before.status) !== String(updated.status);
    const feedbackChanged = typeof feedback !== 'undefined' && String(before.feedback || '') !== String(updated.feedback || '');

    if (updated.user && (statusChanged || feedbackChanged)) {
      const userId = String(updated.user._id);
      const courseId = updated.course ? String(updated.course._id) : '';
      const lessonId = String(updated.lessonId || before.lessonId || '');
      const lessonTitle = String(updated.lessonTitle || before.lessonTitle || 'Project');
      const courseTitle = String(updated.course?.title || 'Course');

      let title = 'Project updated';
      let message = `Your project "${lessonTitle}" has been updated.`;
      let emailSubject = 'Skillverse project update';
      if (statusChanged) {
        if (updated.status === 'approved') {
          title = 'Project approved';
          message = `Your project "${lessonTitle}" for ${courseTitle} was approved.`;
          emailSubject = 'Your Skillverse project was approved';
        } else if (updated.status === 'needs_changes') {
          title = 'Changes requested';
          message = `Changes were requested for your project "${lessonTitle}" for ${courseTitle}.`;
          emailSubject = 'Changes requested for your Skillverse project';
        } else if (updated.status === 'submitted') {
          title = 'Project received';
          message = `Your project "${lessonTitle}" is marked as submitted.`;
          emailSubject = 'Skillverse project received';
        }
      }

      notifyUser(userId, {
        type: updated.status === 'approved' ? 'success' : updated.status === 'needs_changes' ? 'warning' : 'info',
        title,
        message,
        link: courseId ? `/courses/${courseId}` : '/dashboard',
        meta: { submissionId: String(updated._id), courseId, lessonId, status: updated.status }
      }).catch(() => null);

      const feedbackText = String(updated.feedback || '').trim();
      const baseUrl = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
      const html = [
        `<p>${message}</p>`,
        feedbackText ? `<p><b>Feedback:</b></p><pre style="white-space:pre-wrap">${feedbackText.replace(/</g, '&lt;')}</pre>` : '',
        courseId
          ? `<p>Open course: <a href="${baseUrl}/courses/${courseId}">${courseTitle}</a></p>`
          : ''
      ]
        .filter(Boolean)
        .join('');

      sendEmail({
        to: updated.user.email,
        subject: emailSubject,
        text: `${message}${feedbackText ? `\n\nFeedback:\n${feedbackText}` : ''}`,
        html
      }).catch(() => null);
    }

    res.json({
      id: updated._id,
      status: updated.status,
      feedback: updated.feedback,
      reviewedAt: updated.reviewedAt,
      reviewedBy: updated.reviewedByInstructor
        ? { id: updated.reviewedByInstructor._id, name: updated.reviewedByInstructor.name, email: updated.reviewedByInstructor.email }
        : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save review' });
  }
});

module.exports = router;
