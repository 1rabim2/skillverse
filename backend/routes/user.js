const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');
const Notification = require('../models/Notification');
const ProjectSubmission = require('../models/ProjectSubmission');
const authMiddleware = require('../middleware/auth');
const { notifyAllAdmins, notifyUser } = require('../utils/notifications');
const { sendEmail } = require('../utils/email');
const fs = require('fs');
const path = require('path');
const { isAllowedAttachmentMime, writeProjectAttachment, attachmentPath } = require('../utils/projectUploads');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ error: 'Student access required' });
  }
  return next();
}

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function makeCertificateId() {
  // Short, URL-safe-ish id for verification and printing.
  const rand = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `SV-${rand}`;
}

function totalLessonsForCourse(course) {
  const chapters = course?.chapters || [];
  return chapters.reduce((sum, ch) => sum + ((ch.lessons || []).length), 0);
}

function findLesson(course, lessonId) {
  const chapters = course?.chapters || [];
  for (const chapter of chapters) {
    for (const lesson of chapter.lessons || []) {
      if (String(lesson._id) === String(lessonId)) return { chapter, lesson };
    }
  }
  return null;
}

function uniqueLessonIds(completedLessons) {
  const ids = new Set();
  (completedLessons || []).forEach((x) => {
    if (x?.lessonId) ids.add(String(x.lessonId));
  });
  return ids;
}

function safeUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.length > 500) return raw.slice(0, 500);
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return u.toString();
  } catch {
    return '';
  }
}

async function issueCertificateIfNeeded({ user, course, progressEntry }) {
  if ((progressEntry.percent || 0) < 100) return null;
  if (progressEntry.completedAt) return null;

  // Require passing the course final exam (a quiz lesson titled "Final Exam").
  const chapters = Array.isArray(course?.chapters) ? course.chapters : [];
  let finalExamLesson = null;
  for (const ch of chapters) {
    for (const ls of ch?.lessons || []) {
      if (ls?.quiz?.questions?.length && /^final exam/i.test(String(ls.title || '').trim())) {
        finalExamLesson = ls;
      }
    }
  }
  if (finalExamLesson) {
    const attempt = (progressEntry.quizAttempts || [])
      .filter((a) => String(a.lessonId) === String(finalExamLesson._id))
      .sort((a, b) => new Date(b.attemptedAt) - new Date(a.attemptedAt))[0];
    const passPercent = Number.isFinite(Number(finalExamLesson.quiz?.passPercent)) ? Number(finalExamLesson.quiz.passPercent) : 60;
    if (!attempt || !attempt.passed || (attempt.scorePercent || 0) < passPercent) return null;
  }

  progressEntry.completedAt = new Date();

  const existing = await Certificate.findOne({ user: user._id, course: course._id });
  if (existing) return existing;

  let certificateId = makeCertificateId();
  for (let i = 0; i < 3; i++) {
    // eslint-disable-next-line no-await-in-loop
    const clash = await Certificate.findOne({ certificateId });
    if (!clash) break;
    certificateId = makeCertificateId();
  }

  let scorePercent = null;
  let passPercent = null;
  if (finalExamLesson) {
    const attempt = (progressEntry.quizAttempts || [])
      .filter((a) => String(a.lessonId) === String(finalExamLesson._id))
      .sort((a, b) => new Date(b.attemptedAt) - new Date(a.attemptedAt))[0];
    scorePercent = attempt?.scorePercent ?? null;
    passPercent = Number.isFinite(Number(finalExamLesson.quiz?.passPercent)) ? Number(finalExamLesson.quiz.passPercent) : null;
  }
  const certificate = await Certificate.create({ certificateId, user: user._id, course: course._id, scorePercent, passPercent });
  user.certificates = user.certificates || [];
  user.certificates.push({ certificateId, course: course._id, issuedAt: certificate.issuedAt });

  notifyUser(user._id, {
    type: 'success',
    title: 'Certificate issued',
    message: `You earned a certificate for ${course.title}.`,
    link: '/certificates',
    meta: { courseId: String(course._id), certificateId }
  }).catch(() => null);

  notifyAllAdmins({
    type: 'info',
    title: 'Certificate issued',
    message: `Certificate issued to ${user.email} for ${course.title}.`,
    link: '/admin/certificates',
    meta: { userId: String(user._id), courseId: String(course._id), certificateId }
  }).catch(() => null);

  const frontend = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  sendEmail({
    to: user.email,
    subject: 'Your Skillverse certificate is ready',
    text: `You earned a certificate for ${course.title}. View/download it here: ${frontend}/certificates`,
    html: `<p>You earned a certificate for <b>${course.title}</b>.</p><p>View/download it here: <a href="${frontend}/certificates">${frontend}/certificates</a></p>`
  }).catch(() => null);

  return certificate;
}

async function loadUserAndCourse({ userId, courseId }) {
  const [user, course] = await Promise.all([
    User.findById(userId),
    Course.findById(courseId)
  ]);
  return { user, course };
}

router.get('/me/dashboard', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('enrolledCourses', 'title category level thumbnailUrl')
      .populate('progress.course', 'title category level thumbnailUrl')
      .populate('certificates.course', 'title');

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (req.user.role === 'admin') return res.status(403).json({ error: 'Student dashboard requires a student account' });

    const progressByCourseId = new Map();
    (user.progress || []).forEach((p) => {
      if (p.course && p.course._id) {
        progressByCourseId.set(String(p.course._id), {
          percent: p.percent || 0,
          completedAt: p.completedAt || null
        });
      }
    });

    const enrolledCourses = user.enrolledCourses || [];
    const enrolledIds = new Set(enrolledCourses.map((c) => String(c?._id)).filter(Boolean));

    // Dashboard should still feel "full" even when a student enrolled in only 1 course.
    // Show enrolled courses first, then fill the remaining slots with published courses.
    const displayCourses = [...enrolledCourses];
    const remaining = Math.max(0, 8 - displayCourses.length);
    if (remaining > 0) {
      const extras = await Course.find({
        _id: { $nin: Array.from(enrolledIds) },
        $or: [{ status: 'published' }, { status: { $exists: false } }]
      })
        .sort({ createdAt: -1 })
        .limit(remaining);
      displayCourses.push(...extras);
    }

    const courses = displayCourses.map((course) => {
      const p = progressByCourseId.get(String(course._id)) || { percent: 0, completedAt: null };
      return {
        id: course._id,
        title: course.title,
        category: course.category,
        level: course.level,
        thumbnailUrl: course.thumbnailUrl || '',
        progress: p.percent,
        completed: !!p.completedAt || p.percent >= 100
      };
    });

    const issuedCertificates = await Certificate.find({ user: user._id })
      .populate('course', 'title')
      .sort({ issuedAt: -1 })
      .limit(20);

    const completedCourses = courses.filter((c) => c.completed).length;
    const inProgressCourses = courses.filter((c) => c.progress > 0 && c.progress < 100).length;
    const avgProgress = courses.length
      ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length)
      : 0;
    const xp = completedCourses * 120 + inProgressCourses * 30;
    const badges = [
      xp >= 100 ? 'Rising Learner' : null,
      completedCourses >= 1 ? 'Course Finisher' : null,
      issuedCertificates.length >= 1 ? 'Certified Learner' : null,
      completedCourses >= 5 ? 'Skill Explorer' : null
    ].filter(Boolean);

    const recentActivity = [
      ...issuedCertificates.map((c) => ({
        type: 'certificate',
        message: `Certificate issued for ${c.course?.title || 'Course'}`,
        date: c.issuedAt || c.createdAt
      })),
      ...(user.progress || [])
        .filter((p) => p.completedAt)
        .map((p) => ({
          type: 'completion',
          message: `Completed ${p.course?.title || 'Course'}`,
          date: p.completedAt
        }))
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    res.json({
      user: {
        id: user._id,
        name: user.name || 'Student',
        email: user.email
      },
      stats: {
        avgProgress,
        xp,
        badgesCount: badges.length,
        completedCourses,
        certificates: issuedCertificates.length
      },
      badges,
      courses,
      recentActivity
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

router.get('/me', authMiddleware, requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires -verificationToken')
      .populate('enrolledCourses', 'title category level thumbnailUrl skillPath');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.get('/notes', authMiddleware, requireStudent, async (req, res) => {
  try {
    const courseId = String(req.query.courseId || '').trim();
    const lessonId = String(req.query.lessonId || '').trim();
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    const entry = (user.progress || []).find((p) => p.course && String(p.course) === String(courseId));
    const note = entry?.notes?.find((n) => String(n.lessonId || '') === lessonId) || null;
    res.json({ note: { lessonId, text: note?.text || '', updatedAt: note?.updatedAt || null } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

router.put('/notes', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { courseId, lessonId = '', text = '' } = req.body || {};
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });

    const safeLessonId = String(lessonId || '').trim();
    const safeText = String(text ?? '').slice(0, 8000);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    let entry = (user.progress || []).find((p) => p.course && String(p.course) === String(courseId));
    if (!entry) {
      user.progress.push({ course: courseId, percent: 0, notes: [] });
      entry = user.progress[user.progress.length - 1];
    }

    entry.notes = Array.isArray(entry.notes) ? entry.notes : [];
    let note = entry.notes.find((n) => String(n.lessonId || '') === safeLessonId);
    if (!note) {
      entry.notes.push({ lessonId: safeLessonId, text: safeText, updatedAt: new Date() });
      note = entry.notes[entry.notes.length - 1];
    } else {
      note.text = safeText;
      note.updatedAt = new Date();
    }

    await user.save();
    res.json({ note: { lessonId: safeLessonId, text: note.text || '', updatedAt: note.updatedAt || null } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

router.get('/course/:courseId/projects/:lessonId', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });
    if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });

    const { user, course } = await loadUserAndCourse({ userId: req.user.id, courseId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const enrolled = (user.enrolledCourses || []).some((id) => String(id) === String(course._id));
    if (!enrolled) return res.status(400).json({ error: 'You must enroll before accessing project submissions' });

    const found = findLesson(course, lessonId);
    if (!found) return res.status(404).json({ error: 'Lesson not found' });
    if (String(found.lesson?.type || '') !== 'project') return res.status(400).json({ error: 'This lesson is not a project' });

    const submission = await ProjectSubmission.findOne({
      user: user._id,
      course: course._id,
      lessonId: String(lessonId)
    }).populate('reviewedBy', 'name email');

    if (!submission) {
      return res.json({
        submission: {
          repoUrl: '',
          demoUrl: '',
          notes: '',
          status: 'draft',
          feedback: '',
          attachments: [],
          submittedAt: null,
          reviewedAt: null,
          reviewedBy: null
        }
      });
    }

    res.json({
      submission: {
        id: submission._id,
        repoUrl: submission.repoUrl || '',
        demoUrl: submission.demoUrl || '',
        notes: submission.notes || '',
        status: submission.status || 'draft',
        feedback: submission.feedback || '',
        attachments: Array.isArray(submission.attachments)
          ? submission.attachments.map((a) => ({
              fileName: a.fileName,
              originalName: a.originalName || '',
              mime: a.mime || '',
              size: a.size || 0,
              uploadedAt: a.uploadedAt || null
            }))
          : [],
        submittedAt: submission.submittedAt || null,
        reviewedAt: submission.reviewedAt || null,
        reviewedBy: submission.reviewedBy ? { id: submission.reviewedBy._id, name: submission.reviewedBy.name, email: submission.reviewedBy.email } : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load project submission' });
  }
});

// Upload an attachment (screenshot/pdf/zip) for a project submission (one file per request).
router.post(
  '/course/:courseId/projects/:lessonId/attachments',
  authMiddleware,
  requireStudent,
  express.raw({
    type: ['image/*', 'application/pdf', 'application/zip', 'application/x-zip-compressed', 'text/plain', 'application/octet-stream'],
    limit: '25mb'
  }),
  async (req, res) => {
    try {
      const { courseId, lessonId } = req.params;
      if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });
      if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });

      const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const originalName = String(req.headers['x-filename'] || req.headers['x-file-name'] || '').trim();
      const size = Buffer.byteLength(req.body || Buffer.alloc(0));
      if (!size) return res.status(400).json({ error: 'Empty upload' });
      if (!isAllowedAttachmentMime(mime)) return res.status(415).json({ error: 'Unsupported attachment type (use png/jpg/webp/pdf/zip)' });

      // Enforce size caps per type
      const isZip = mime === 'application/zip' || mime === 'application/x-zip-compressed';
      const max = isZip ? 25 * 1024 * 1024 : 15 * 1024 * 1024;
      if (size > max) return res.status(413).json({ error: `Attachment too large (max ${isZip ? '25MB' : '15MB'})` });

      const { user, course } = await loadUserAndCourse({ userId: req.user.id, courseId });
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
      if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const enrolled = (user.enrolledCourses || []).some((id) => String(id) === String(course._id));
      if (!enrolled) return res.status(400).json({ error: 'You must enroll before uploading project files' });

      const found = findLesson(course, lessonId);
      if (!found) return res.status(404).json({ error: 'Lesson not found' });
      if (String(found.lesson?.type || '') !== 'project') return res.status(400).json({ error: 'This lesson is not a project' });

      const submission = await ProjectSubmission.findOneAndUpdate(
        { user: user._id, course: course._id, lessonId: String(lessonId) },
        {
          $setOnInsert: {
            lessonTitle: String(found.lesson?.title || ''),
            status: 'draft'
          },
          $set: {
            lessonTitle: String(found.lesson?.title || '')
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      const current = Array.isArray(submission.attachments) ? submission.attachments : [];
      if (current.length >= 8) return res.status(400).json({ error: 'Attachment limit reached (max 8 files)' });

      const stored = writeProjectAttachment({
        buffer: Buffer.from(req.body),
        mime,
        originalName,
        submissionId: submission._id
      });

      submission.attachments = current.concat([
        {
          fileName: stored.fileName,
          originalName: originalName || stored.fileName,
          mime,
          size,
          uploadedAt: new Date()
        }
      ]);
      await submission.save();

      res.json({
        ok: true,
        attachment: submission.attachments[submission.attachments.length - 1],
        attachments: submission.attachments
      });
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ error: 'Submission already exists. Please retry.' });
      res.status(err.status || 500).json({ error: err.message || 'Failed to upload attachment' });
    }
  }
);

router.get('/course/:courseId/projects/:lessonId/attachments/:fileName', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { courseId, lessonId, fileName } = req.params;
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });
    if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });

    const submission = await ProjectSubmission.findOne({ user: req.user.id, course: courseId, lessonId: String(lessonId) });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const att = (submission.attachments || []).find((a) => String(a.fileName) === String(fileName));
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    const p = attachmentPath({ submissionId: submission._id, fileName: att.fileName });
    if (!p || !fs.existsSync(p)) return res.status(404).json({ error: 'File missing' });

    res.setHeader('Content-Type', att.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${String(att.originalName || att.fileName).replace(/\"/g, '')}"`);
    fs.createReadStream(p).pipe(res);
  } catch {
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

router.delete('/course/:courseId/projects/:lessonId/attachments/:fileName', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { courseId, lessonId, fileName } = req.params;
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });
    if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });

    const submission = await ProjectSubmission.findOne({ user: req.user.id, course: courseId, lessonId: String(lessonId) });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (submission.status === 'approved') return res.status(400).json({ error: 'Cannot remove attachments after approval' });

    const att = (submission.attachments || []).find((a) => String(a.fileName) === String(fileName));
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    const p = attachmentPath({ submissionId: submission._id, fileName: att.fileName });
    if (p && fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        // ignore
      }
    }

    submission.attachments = (submission.attachments || []).filter((a) => String(a.fileName) !== String(fileName));
    await submission.save();
    res.json({ ok: true, attachments: submission.attachments || [] });
  } catch {
    res.status(500).json({ error: 'Failed to remove attachment' });
  }
});

router.put('/course/:courseId/projects/:lessonId', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });
    if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });

    const { repoUrl, demoUrl, notes } = req.body || {};
    const safeRepoUrl = safeUrl(repoUrl);
    const safeDemoUrl = safeUrl(demoUrl);
    const safeNotes = String(notes ?? '').slice(0, 6000);

    if (!safeRepoUrl && !safeDemoUrl && !safeNotes.trim()) {
      return res.status(400).json({ error: 'Add a repo link, demo link, or notes before submitting' });
    }

    const { user, course } = await loadUserAndCourse({ userId: req.user.id, courseId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const enrolled = (user.enrolledCourses || []).some((id) => String(id) === String(course._id));
    if (!enrolled) return res.status(400).json({ error: 'You must enroll before submitting projects' });

    const found = findLesson(course, lessonId);
    if (!found) return res.status(404).json({ error: 'Lesson not found' });
    if (String(found.lesson?.type || '') !== 'project') return res.status(400).json({ error: 'This lesson is not a project' });

    const updated = await ProjectSubmission.findOneAndUpdate(
      { user: user._id, course: course._id, lessonId: String(lessonId) },
      {
        $set: {
          lessonTitle: String(found.lesson?.title || ''),
          repoUrl: safeRepoUrl,
          demoUrl: safeDemoUrl,
          notes: safeNotes,
          status: 'submitted',
          submittedAt: new Date()
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    notifyUser(user._id, {
      type: 'info',
      title: 'Project submitted',
      message: `Project submitted for ${found.lesson?.title || 'Project'}.`,
      link: `/courses/${course._id}`,
      meta: { courseId: String(course._id), lessonId: String(lessonId) }
    }).catch(() => null);

    notifyAllAdmins({
      type: 'info',
      title: 'Project submission',
      message: `${user.email} submitted a project: ${found.lesson?.title || 'Project'} (${course.title || 'Course'}).`,
      link: '/admin/projects',
      meta: { userId: String(user._id), courseId: String(course._id), lessonId: String(lessonId) }
    }).catch(() => null);

    sendEmail({
      to: user.email,
      subject: 'Skillverse project submitted',
      text: `We received your project submission for ${found.lesson?.title || 'Project'} (${course.title || 'Course'}). Our team will review it soon.`,
      html: `<p>We received your project submission for <b>${found.lesson?.title || 'Project'}</b> (${course.title || 'Course'}).</p><p>Our team will review it soon.</p>`
    }).catch(() => null);

    res.json({
      submission: {
        id: updated._id,
        repoUrl: updated.repoUrl || '',
        demoUrl: updated.demoUrl || '',
        notes: updated.notes || '',
        status: updated.status || 'submitted',
        feedback: updated.feedback || '',
        attachments: Array.isArray(updated.attachments)
          ? updated.attachments.map((a) => ({
              fileName: a.fileName,
              originalName: a.originalName || '',
              mime: a.mime || '',
              size: a.size || 0,
              uploadedAt: a.uploadedAt || null
            }))
          : [],
        submittedAt: updated.submittedAt || null,
        reviewedAt: updated.reviewedAt || null
      }
    });
  } catch (err) {
    // Unique index race on first upsert
    if (err?.code === 11000) return res.status(409).json({ error: 'Submission already exists. Please retry.' });
    res.status(500).json({ error: 'Failed to submit project' });
  }
});

router.get('/me/projects', authMiddleware, requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    const items = await ProjectSubmission.find({ user: user._id })
      .populate('course', 'title category level')
      .sort({ updatedAt: -1 })
      .limit(200);

    res.json({
      items: (items || []).map((s) => ({
        id: s._id,
        status: s.status || 'draft',
        lessonId: s.lessonId,
        lessonTitle: s.lessonTitle || '',
        repoUrl: s.repoUrl || '',
        demoUrl: s.demoUrl || '',
        notes: s.notes || '',
        feedback: s.feedback || '',
        submittedAt: s.submittedAt || null,
        reviewedAt: s.reviewedAt || null,
        updatedAt: s.updatedAt || null,
        attachmentCount: Array.isArray(s.attachments) ? s.attachments.length : 0,
        course: s.course ? { id: s.course._id, title: s.course.title, category: s.course.category, level: s.course.level } : null
      }))
    });
  } catch {
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

router.put('/me', authMiddleware, requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });

    function clamp(value, maxLen) {
      const str = String(value ?? '').trim();
      return str.length > maxLen ? str.slice(0, maxLen) : str;
    }

    const next = req.body || {};

    // Keep email immutable here (use a separate flow if you ever support changing it).
    if (typeof next.name !== 'undefined') user.name = clamp(next.name, 80);
    if (typeof next.headline !== 'undefined') user.headline = clamp(next.headline, 120);
    if (typeof next.phone !== 'undefined') user.phone = clamp(next.phone, 40);
    if (typeof next.location !== 'undefined') user.location = clamp(next.location, 80);
    if (typeof next.bio !== 'undefined') user.bio = clamp(next.bio, 600);
    if (typeof next.website !== 'undefined') user.website = clamp(next.website, 200);
    if (typeof next.github !== 'undefined') user.github = clamp(next.github, 200);
    if (typeof next.linkedin !== 'undefined') user.linkedin = clamp(next.linkedin, 200);
    if (typeof next.avatarUrl !== 'undefined') user.avatarUrl = clamp(next.avatarUrl, 300);

    await user.save();

    const safe = await User.findById(user._id).select('-password -resetPasswordToken -resetPasswordExpires -verificationToken');
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/change-password', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword) return res.status(400).json({ error: 'newPassword required' });
    if (String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });

    // If this is a local (email/password) account, require the current password.
    // If this account is linked to Google, allow changing password without current password
    // because the user is already authenticated via a valid JWT.
    if (!user.googleSub) {
      if (!currentPassword) return res.status(400).json({ error: 'currentPassword required' });
      const match = await bcrypt.compare(String(currentPassword), user.password);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    } else if (currentPassword) {
      const match = await bcrypt.compare(String(currentPassword), user.password);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(newPassword), salt);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.post('/link-google', authMiddleware, requireStudent, async (req, res) => {
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

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });

    if (String(user.email).toLowerCase() !== email) {
      return res.status(400).json({ error: 'Google email must match your account email' });
    }

    const existingBySub = await User.findOne({ googleSub });
    if (existingBySub && String(existingBySub._id) !== String(user._id)) {
      return res.status(409).json({ error: 'Google account is already linked to another user' });
    }

    if (user.googleSub && user.googleSub !== googleSub) {
      return res.status(409).json({ error: 'This account is already linked to a different Google account' });
    }

    user.googleSub = googleSub;
    if (!user.isVerified) user.isVerified = true;
    await user.save();

    const safe = await User.findById(user._id).select('-password -resetPasswordToken -resetPasswordExpires -verificationToken');
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: 'Failed to link Google account' });
  }
});

router.get('/me/portfolio', authMiddleware, requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires -verificationToken')
      .populate('enrolledCourses', 'title category level thumbnailUrl status skillPath')
      .populate('progress.course', 'title category level thumbnailUrl status skillPath')
      .populate('certificates.course', 'title category level');

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    const completedProgress = (user.progress || []).filter((p) => (p?.completedAt || (p?.percent || 0) >= 100) && p.course);
    const completedCourses = completedProgress
      .map((p) => ({
        id: p.course?._id,
        title: p.course?.title || 'Course',
        category: p.course?.category || 'General',
        level: p.course?.level || 'Beginner',
        thumbnailUrl: p.course?.thumbnailUrl || '',
        completedAt: p.completedAt || null
      }))
      .filter((c) => c.id);

    const issuedCertificates = await Certificate.find({ user: user._id })
      .populate('course', 'title category level')
      .sort({ issuedAt: -1 })
      .limit(50);

    res.json({
      user: {
        id: user._id,
        name: user.name || 'Student',
        email: user.email
      },
      stats: {
        enrolledCourses: (user.enrolledCourses || []).length,
        completedCourses: completedCourses.length,
        certificates: issuedCertificates.length
      },
      completedCourses,
      certificates: issuedCertificates.map((c) => ({
        id: c._id,
        certificateId: c.certificateId,
        issuedAt: c.issuedAt,
        course: c.course
          ? { id: c.course._id, title: c.course.title, category: c.course.category, level: c.course.level }
          : null
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load portfolio' });
  }
});

router.post('/enroll', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { courseId } = req.body || {};
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });

    const [user, course] = await Promise.all([User.findById(req.user.id), Course.findById(courseId)]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const alreadyEnrolled = (user.enrolledCourses || []).some((id) => String(id) === String(course._id));
    if (!alreadyEnrolled) user.enrolledCourses.push(course._id);

    const progressEntry = (user.progress || []).find((p) => p.course && String(p.course) === String(course._id));
    if (!progressEntry) user.progress.push({ course: course._id, percent: 0 });

    await user.save();

    notifyUser(user._id, {
      type: 'info',
      title: 'Enrolled',
      message: `You enrolled in ${course.title}.`,
      link: `/courses/${course._id}`,
      meta: { courseId: String(course._id) }
    }).catch(() => null);

    notifyAllAdmins({
      type: 'info',
      title: 'New enrollment',
      message: `${user.email} enrolled in ${course.title}.`,
      link: '/admin/users',
      meta: { userId: String(user._id), courseId: String(course._id) }
    }).catch(() => null);

    res.json({ message: alreadyEnrolled ? 'Already enrolled' : 'Enrolled', courseId: String(course._id) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

router.post('/progress', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { courseId, percent } = req.body || {};
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });
    const nextPercent = Number(percent);
    if (!Number.isFinite(nextPercent) || nextPercent < 0 || nextPercent > 100) {
      return res.status(400).json({ error: 'percent must be between 0 and 100' });
    }

    const { user, course } = await loadUserAndCourse({ userId: req.user.id, courseId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const lessonCount = totalLessonsForCourse(course);
    if (lessonCount > 0) {
      return res.status(400).json({ error: 'This course uses lessons/quizzes. Update progress by completing lessons instead.' });
    }

    const enrolled = (user.enrolledCourses || []).some((id) => String(id) === String(course._id));
    if (!enrolled) return res.status(400).json({ error: 'You must enroll before updating progress' });

    let entry = (user.progress || []).find((p) => p.course && String(p.course) === String(course._id));
    if (!entry) {
      user.progress.push({ course: course._id, percent: 0 });
      entry = user.progress[user.progress.length - 1];
    }

    entry.percent = Math.max(entry.percent || 0, nextPercent);
    let certificate = null;

    certificate = await issueCertificateIfNeeded({ user, course, progressEntry: entry });

    await user.save();
    res.json({
      message: 'Progress updated',
      progress: { courseId: String(course._id), percent: entry.percent, completedAt: entry.completedAt || null },
      certificate: certificate
        ? { certificateId: certificate.certificateId, issuedAt: certificate.issuedAt, courseId: String(course._id) }
        : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

router.get('/course/:courseId/progress', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });

    const { user, course } = await loadUserAndCourse({ userId: req.user.id, courseId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const entry = (user.progress || []).find((p) => p.course && String(p.course) === String(course._id));
    const completed = uniqueLessonIds(entry?.completedLessons || []);
    const latestAttempts = new Map();
    (entry?.quizAttempts || []).forEach((a) => {
      const id = String(a.lessonId || '');
      if (!id) return;
      const existing = latestAttempts.get(id);
      if (!existing || new Date(a.attemptedAt) > new Date(existing.attemptedAt)) latestAttempts.set(id, a);
    });

    res.json({
      progress: {
        courseId: String(course._id),
        percent: entry?.percent || 0,
        completedAt: entry?.completedAt || null,
        completedLessonIds: Array.from(completed),
        latestQuizByLessonId: Object.fromEntries(
          Array.from(latestAttempts.entries()).map(([lessonId, a]) => [
            lessonId,
            {
              scorePercent: a.scorePercent || 0,
              correct: a.correct || 0,
              total: a.total || 0,
              passed: !!a.passed,
              attemptedAt: a.attemptedAt || null
            }
          ])
        )
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load course progress' });
  }
});

router.post('/course/:courseId/lessons/:lessonId/complete', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });
    if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });

    const { user, course } = await loadUserAndCourse({ userId: req.user.id, courseId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const enrolled = (user.enrolledCourses || []).some((id) => String(id) === String(course._id));
    if (!enrolled) return res.status(400).json({ error: 'You must enroll before completing lessons' });

    const found = findLesson(course, lessonId);
    if (!found) return res.status(404).json({ error: 'Lesson not found' });

    let entry = (user.progress || []).find((p) => p.course && String(p.course) === String(course._id));
    if (!entry) {
      user.progress.push({ course: course._id, percent: 0 });
      entry = user.progress[user.progress.length - 1];
    }

    const completed = uniqueLessonIds(entry.completedLessons || []);
    if (completed.has(String(lessonId))) {
      return res.json({ message: 'Already completed', progress: { courseId: String(course._id), percent: entry.percent || 0 } });
    }

    const quiz = found.lesson?.quiz;
    const questions = quiz?.questions || [];
    if (questions.length > 0) {
      const latest = (entry.quizAttempts || [])
        .filter((a) => String(a.lessonId) === String(lessonId))
        .sort((a, b) => new Date(b.attemptedAt) - new Date(a.attemptedAt))[0];
      if (!latest || !latest.passed) {
        return res.status(400).json({ error: 'Pass the quiz before completing this lesson' });
      }
    }

    entry.completedLessons = entry.completedLessons || [];
    entry.completedLessons.push({ lessonId: String(lessonId), completedAt: new Date() });

    const totalLessons = totalLessonsForCourse(course);
    const nextCompleted = completed.size + 1;
    entry.percent = totalLessons > 0 ? Math.min(100, Math.round((nextCompleted / totalLessons) * 100)) : (entry.percent || 0);

    const certificate = await issueCertificateIfNeeded({ user, course, progressEntry: entry });
    await user.save();

    res.json({
      message: 'Lesson completed',
      progress: {
        courseId: String(course._id),
        percent: entry.percent || 0,
        completedAt: entry.completedAt || null,
        completedLessonIds: Array.from(uniqueLessonIds(entry.completedLessons || []))
      },
      certificate: certificate
        ? { certificateId: certificate.certificateId, issuedAt: certificate.issuedAt, courseId: String(course._id) }
        : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete lesson' });
  }
});

router.post('/course/:courseId/lessons/:lessonId/quiz', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { answers } = req.body || {};
    if (!courseId || !isObjectId(courseId)) return res.status(400).json({ error: 'Valid courseId is required' });
    if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers must be an array' });

    const { user, course } = await loadUserAndCourse({ userId: req.user.id, courseId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const enrolled = (user.enrolledCourses || []).some((id) => String(id) === String(course._id));
    if (!enrolled) return res.status(400).json({ error: 'You must enroll before taking quizzes' });

    const found = findLesson(course, lessonId);
    if (!found) return res.status(404).json({ error: 'Lesson not found' });
    const quiz = found.lesson?.quiz;
    const questions = quiz?.questions || [];
    if (questions.length === 0) return res.status(400).json({ error: 'No quiz found for this lesson' });

    if (answers.length !== questions.length) {
      return res.status(400).json({ error: `answers must have length ${questions.length}` });
    }

    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      const a = Number(answers[i]);
      if (!Number.isFinite(a) || a < 0) continue;
      if (a === Number(questions[i].correctIndex)) correct += 1;
    }

    const total = questions.length;
    const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passPercent = Number.isFinite(Number(quiz.passPercent)) ? Number(quiz.passPercent) : 60;
    const passed = scorePercent >= passPercent;

    let entry = (user.progress || []).find((p) => p.course && String(p.course) === String(course._id));
    if (!entry) {
      user.progress.push({ course: course._id, percent: 0 });
      entry = user.progress[user.progress.length - 1];
    }

    entry.quizAttempts = entry.quizAttempts || [];
    const existing = (entry.quizAttempts || []).filter((a) => String(a.lessonId) === String(lessonId));
    const keep = existing.sort((a, b) => new Date(b.attemptedAt) - new Date(a.attemptedAt)).slice(0, 4);
    entry.quizAttempts = (entry.quizAttempts || []).filter((a) => String(a.lessonId) !== String(lessonId)).concat(keep);
    entry.quizAttempts.push({
      lessonId: String(lessonId),
      scorePercent,
      correct,
      total,
      passed,
      answers: answers.map((x) => Number(x)).filter((x) => Number.isFinite(x)),
      attemptedAt: new Date()
    });

    const totalLessons = totalLessonsForCourse(course);
    const completed = uniqueLessonIds(entry.completedLessons || []);

    if (passed && !completed.has(String(lessonId))) {
      entry.completedLessons = entry.completedLessons || [];
      entry.completedLessons.push({ lessonId: String(lessonId), completedAt: new Date() });
      entry.percent = totalLessons > 0 ? Math.min(100, Math.round(((completed.size + 1) / totalLessons) * 100)) : (entry.percent || 0);
      
      // Award XP for passing a quiz lesson
      user.xp = (user.xp || 0) + 25; // 25 XP per passed quiz
      
      // Update last activity for streak tracking
      const today = new Date().toDateString();
      const lastActivity = user.lastActivityDate ? user.lastActivityDate.toDateString() : null;
      if (lastActivity !== today) {
        if (lastActivity === new Date(Date.now() - 86400000).toDateString()) {
          // Consecutive day
          user.currentStreak = (user.currentStreak || 0) + 1;
        } else {
          // Streak broken
          user.currentStreak = 1;
        }
        user.lastActivityDate = new Date();
      }
    } else if (totalLessons > 0) {
      entry.percent = Math.min(100, Math.round((completed.size / totalLessons) * 100));
    }

    const certificate = await issueCertificateIfNeeded({ user, course, progressEntry: entry });
    
    // Award XP and badge for completing a course
    if (certificate && !user.certificates?.some(c => c.certificateId === certificate.certificateId)) {
      user.xp = (user.xp || 0) + 100; // 100 XP for course completion
      
      // Award badge for first course completion
      const courseCount = await Certificate.countDocuments({ user: user._id });
      if (courseCount === 1) {
        user.badges = user.badges || [];
        user.badges.push({
          name: 'First Course',
          description: 'Completed your first course on Skillverse',
          icon: '🏆',
          earnedAt: new Date()
        });
      }
      
      // Award badge for 5 courses
      if (courseCount === 5) {
        user.badges = user.badges || [];
        user.badges.push({
          name: 'Course Collector',
          description: 'Completed 5 courses',
          icon: '📚',
          earnedAt: new Date()
        });
      }
    }
    
    await user.save();

    res.json({
      message: passed ? 'Quiz passed' : 'Quiz submitted',
      result: { scorePercent, correct, total, passed, passPercent },
      progress: {
        courseId: String(course._id),
        percent: entry.percent || 0,
        completedAt: entry.completedAt || null,
        completedLessonIds: Array.from(uniqueLessonIds(entry.completedLessons || []))
      },
      certificate: certificate
        ? { certificateId: certificate.certificateId, issuedAt: certificate.issuedAt, courseId: String(course._id) }
        : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

router.get('/me/certificates', authMiddleware, requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    const items = await Certificate.find({ user: user._id })
      .populate('course', 'title category level')
      .sort({ issuedAt: -1 })
      .limit(50);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load certificates' });
  }
});

// Download certificate as PDF
router.get('/me/certificates/:certificateId/download', authMiddleware, requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId,
      user: user._id
    }).populate('course', 'title');

    if (!certificate) return res.status(404).json({ error: 'Certificate not found' });

    const { generateCertificatePDF } = require('../utils/certificate');

    const pdfBuffer = await generateCertificatePDF({
      certificateId: certificate.certificateId,
      studentName: user.name || user.email,
      courseName: certificate.course?.title || 'Course',
      score: Math.round(certificate.scorePercent || 100),
      issueDate: certificate.issuedAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Skillverse-Certificate-${certificate.certificateId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate certificate PDF' });
  }
});

router.get('/notifications', authMiddleware, requireStudent, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 15)));
    const unreadOnly = String(req.query.unread || '') === 'true';
    const filter = {
      recipientType: 'user',
      recipient: req.user.id,
      ...(unreadOnly ? { readAt: null } : {})
    };

    const [items, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ recipientType: 'user', recipient: req.user.id, readAt: null })
    ]);

    res.json({ items, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

router.patch('/notifications/:id/read', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipientType: 'user', recipient: req.user.id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.patch('/notifications/:id/unread', authMiddleware, requireStudent, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipientType: 'user', recipient: req.user.id },
      { $set: { readAt: null } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.post('/notifications/read-all', authMiddleware, requireStudent, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientType: 'user', recipient: req.user.id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Leaderboard - public endpoint
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const sortBy = String(req.query.sortBy || 'xp'); // xp | streak | certificates
    
    let sortField = { xp: -1 };
    if (sortBy === 'streak') {
      sortField = { currentStreak: -1, xp: -1 };
    } else if (sortBy === 'certificates') {
      sortField = { 'certificates': -1, xp: -1 };
    }

    const leaderboard = await User.find({
      isActive: true,
      isVerified: true,
      role: 'student'
    })
      .select('name avatarUrl headline xp badges currentStreak certificates createdAt')
      .sort(sortField)
      .limit(limit);

    const items = leaderboard.map((user, index) => ({
      rank: index + 1,
      id: String(user._id),
      name: user.name || 'Anonymous',
      avatarUrl: user.avatarUrl || '',
      headline: user.headline || '',
      xp: user.xp || 0,
      badges: (user.badges || []).slice(0, 3), // Top 3 badges
      badgeCount: (user.badges || []).length,
      currentStreak: user.currentStreak || 0,
      certificateCount: (user.certificates || []).length,
      joinedAt: user.createdAt
    }));

    res.json({ items, sortBy, limit});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// User stats - authenticated endpoint
router.get('/me/stats', authMiddleware, requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get user's rank
    const rank = await User.countDocuments({
      xp: { $gt: user.xp || 0 },
      isActive: true,
      isVerified: true,
      role: 'student'
    }).then(count => count + 1);

    const totalUsers = await User.countDocuments({
      isActive: true,
      isVerified: true,
      role: 'student'
    });

    res.json({
      xp: user.xp || 0,
      badges: user.badges || [],
      currentStreak: user.currentStreak || 0,
      certificateCount: (user.certificates || []).length,
      coursesEnrolled: (user.enrolledCourses || []).length,
      rank,
      totalUsers,
      percentile: totalUsers > 0 ? Math.round(((totalUsers - rank + 1) / totalUsers) * 100) : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

module.exports = router;
