const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const { notifyAllAdmins, notifyUser } = require('../utils/notifications');

const router = express.Router();

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

async function issueCertificateIfNeeded({ user, course, progressEntry }) {
  if ((progressEntry.percent || 0) < 100) return null;
  if (progressEntry.completedAt) return null;

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

  const certificate = await Certificate.create({ certificateId, user: user._id, course: course._id });
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

    let displayCourses = user.enrolledCourses || [];
    if (displayCourses.length === 0) {
      displayCourses = await Course.find().sort({ createdAt: -1 }).limit(8);
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
    } else if (totalLessons > 0) {
      entry.percent = Math.min(100, Math.round((completed.size / totalLessons) * 100));
    }

    const certificate = await issueCertificateIfNeeded({ user, course, progressEntry: entry });
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

module.exports = router;
