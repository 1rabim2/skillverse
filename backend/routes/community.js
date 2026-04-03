const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const CommunityPost = require('../models/CommunityPost');
const { notifyAllAdmins } = require('../utils/notifications');

const router = express.Router();

function objectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sortSpec(sort) {
  const value = String(sort || '').trim().toLowerCase();
  if (value === 'most_answered') return { commentsCount: -1, createdAt: -1 };
  if (value === 'oldest') return { createdAt: 1 };
  if (value === 'last_activity') return { lastActivityAt: -1, createdAt: -1 };
  return { createdAt: -1 };
}

function requireStudentJwt(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ error: 'Student access required' });
  }
  return next();
}

async function loadStudent(req) {
  const user = await User.findById(req.user.id).select('name email role isActive isVerified');
  return user;
}

function cleanText(value, maxLen) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

async function buildCommunityStats({ userId }) {
  const userObjectId = objectId(userId) ? new mongoose.Types.ObjectId(userId) : null;
  const [approvedPosts, pendingPosts, myPosts, totalAnswers] = await Promise.all([
    CommunityPost.countDocuments({ status: 'approved' }),
    CommunityPost.countDocuments({ status: 'pending' }),
    userObjectId ? CommunityPost.countDocuments({ authorId: userObjectId, status: { $ne: 'removed' } }) : Promise.resolve(0),
    CommunityPost.aggregate([
      { $match: { status: 'approved' } },
      { $project: { commentsCount: { $size: { $ifNull: ['$comments', []] } } } },
      { $group: { _id: null, total: { $sum: '$commentsCount' } } }
    ])
  ]);

  const answersTotal = Array.isArray(totalAnswers) && totalAnswers[0] ? totalAnswers[0].total : 0;
  return {
    approvedPosts,
    pendingPosts,
    myPosts,
    answersTotal
  };
}

// List Q&A posts (approved + your own pending)
router.get('/', authMiddleware, requireStudentJwt, async (req, res) => {
  try {
    const user = await loadStudent(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const search = cleanText(req.query.search, 80);
    const mineOnly = String(req.query.mine || '').toLowerCase() === 'true';
    const status = String(req.query.status || '').trim().toLowerCase(); // approved | pending (mine only)
    const answered = String(req.query.answered || '').trim().toLowerCase(); // true | false
    const sort = String(req.query.sort || '').trim();
    const includeStats = String(req.query.includeStats || '').toLowerCase() === 'true';

    const filter = mineOnly
      ? { status: { $ne: 'removed' }, authorId: user._id }
      : { status: { $ne: 'removed' }, $or: [{ status: 'approved' }, { authorId: user._id }] };

    if (status === 'approved') filter.status = 'approved';
    if (status === 'pending') {
      filter.status = 'pending';
      filter.authorId = user._id;
    }

    if (search) {
      const safe = escapeRegExp(search);
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { content: { $regex: safe, $options: 'i' } },
          { authorName: { $regex: safe, $options: 'i' } }
        ]
      });
    }

    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          commentsCount: { $size: { $ifNull: ['$comments', []] } },
          lastCommentAt: {
            $let: {
              vars: { last: { $arrayElemAt: ['$comments.createdAt', -1] } },
              in: '$$last'
            }
          }
        }
      },
      {
        $addFields: {
          lastActivityAt: { $ifNull: ['$lastCommentAt', '$createdAt'] }
        }
      }
    ];

    if (answered === 'true') pipeline.push({ $match: { commentsCount: { $gt: 0 } } });
    if (answered === 'false') pipeline.push({ $match: { commentsCount: 0 } });

    const sortStage = sortSpec(sort);
    pipeline.push({ $sort: sortStage });
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    // return preview comments only to keep list light
    pipeline.push({
      $project: {
        authorId: 1,
        authorName: 1,
        content: 1,
        reported: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        commentsCount: 1,
        lastActivityAt: 1,
        commentsPreview: { $slice: [{ $ifNull: ['$comments', []] }, 3]
        }
      }
    });

    const [items, total, stats] = await Promise.all([
      CommunityPost.aggregate(pipeline),
      CommunityPost.countDocuments(
        answered === 'true'
          ? { ...filter, comments: { $exists: true, $ne: [] } }
          : answered === 'false'
            ? { ...filter, $or: [{ comments: { $exists: false } }, { comments: { $size: 0 } }] }
            : filter
      ),
      includeStats ? buildCommunityStats({ userId: user._id }) : Promise.resolve(null)
    ]);

    const safeItems = (items || []).map((p) => {
      const raw = p;
      const isMine = raw.authorId && String(raw.authorId) === String(user._id);
      return {
        _id: raw._id,
        authorName: raw.authorName,
        content: raw.content,
        reported: !!raw.reported,
        status: raw.status,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        lastActivityAt: raw.lastActivityAt || raw.createdAt,
        commentsCount: Number(raw.commentsCount || 0),
        isMine,
        commentsPreview: (raw.commentsPreview || []).map((c) => ({
          _id: c._id,
          authorName: c.authorName,
          content: c.content,
          reported: !!c.reported,
          createdAt: c.createdAt,
          isMine: c.authorId && String(c.authorId) === String(user._id)
        }))
      };
    });

    res.json({
      items: safeItems,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total,
      stats: stats || undefined
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load community posts' });
  }
});

// Get a single post (approved or yours)
router.get('/:id', authMiddleware, requireStudentJwt, async (req, res) => {
  try {
    const user = await loadStudent(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

    const post = await CommunityPost.findById(req.params.id);
    if (!post || post.status === 'removed') return res.status(404).json({ error: 'Post not found' });

    const isMine = post.authorId && String(post.authorId) === String(user._id);
    if (!isMine && post.status !== 'approved') return res.status(404).json({ error: 'Post not found' });

    const raw = post.toObject({ virtuals: true });
    res.json({
      post: {
        _id: raw._id,
        authorName: raw.authorName,
        content: raw.content,
        reported: !!raw.reported,
        status: raw.status,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        isMine,
        comments: (raw.comments || []).map((c) => ({
          _id: c._id,
          authorName: c.authorName,
          content: c.content,
          reported: !!c.reported,
          createdAt: c.createdAt,
          isMine: c.authorId && String(c.authorId) === String(user._id)
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load post' });
  }
});

// Create a new question/post (goes to pending for admin approval)
router.post('/', authMiddleware, requireStudentJwt, async (req, res) => {
  try {
    const user = await loadStudent(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    const content = cleanText(req.body?.content, 1200);
    if (!content || content.length < 8) return res.status(400).json({ error: 'Question is too short' });

    const authorName = cleanText(user.name, 60) || user.email;
    const post = await CommunityPost.create({
      authorId: user._id,
      authorName,
      content,
      status: 'pending',
      reported: false,
      comments: []
    });

    notifyAllAdmins({
      type: 'info',
      title: 'New community question',
      message: `${authorName} submitted a new question for review.`,
      link: '/admin/community',
      meta: { postId: String(post._id) }
    }).catch(() => null);

    res.status(201).json({ postId: post._id, status: post.status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Edit your pending post
router.patch('/:id', authMiddleware, requireStudentJwt, async (req, res) => {
  try {
    const user = await loadStudent(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const content = cleanText(req.body?.content, 1200);
    if (!content || content.length < 8) return res.status(400).json({ error: 'Question is too short' });

    const post = await CommunityPost.findById(req.params.id);
    if (!post || post.status === 'removed') return res.status(404).json({ error: 'Post not found' });

    const isMine = post.authorId && String(post.authorId) === String(user._id);
    if (!isMine) return res.status(403).json({ error: 'You can only edit your own posts' });
    if (post.status !== 'pending') return res.status(403).json({ error: 'Only pending posts can be edited' });

    post.content = content;
    await post.save();
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Comment on an approved post
router.post('/:id/comments', authMiddleware, requireStudentJwt, async (req, res) => {
  try {
    const user = await loadStudent(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const content = cleanText(req.body?.content, 800);
    if (!content || content.length < 2) return res.status(400).json({ error: 'Comment is too short' });

    const post = await CommunityPost.findById(req.params.id);
    if (!post || post.status === 'removed') return res.status(404).json({ error: 'Post not found' });
    if (post.status !== 'approved') return res.status(403).json({ error: 'You can only comment on approved posts' });

    const authorName = cleanText(user.name, 60) || user.email;
    post.comments.push({
      authorId: user._id,
      authorName,
      content,
      reported: false
    });
    await post.save();
    res.json({ message: 'Comment added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete your own comment
router.delete('/:postId/comments/:commentId', authMiddleware, requireStudentJwt, async (req, res) => {
  try {
    const user = await loadStudent(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    if (!objectId(req.params.postId) || !objectId(req.params.commentId)) return res.status(400).json({ error: 'Invalid id' });
    const post = await CommunityPost.findById(req.params.postId);
    if (!post || post.status === 'removed') return res.status(404).json({ error: 'Post not found' });

    const comment = (post.comments || []).id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const isMine = comment.authorId && String(comment.authorId) === String(user._id);
    if (!isMine) return res.status(403).json({ error: 'You can only delete your own comments' });

    comment.deleteOne();
    await post.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Report a post
router.patch('/:id/report', authMiddleware, requireStudentJwt, async (req, res) => {
  try {
    const user = await loadStudent(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const post = await CommunityPost.findById(req.params.id);
    if (!post || post.status === 'removed') return res.status(404).json({ error: 'Post not found' });

    post.reported = true;
    await post.save();
    res.json({ message: 'Reported' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to report post' });
  }
});

// Report a comment
router.patch('/:postId/comments/:commentId/report', authMiddleware, requireStudentJwt, async (req, res) => {
  try {
    const user = await loadStudent(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    if (!objectId(req.params.postId) || !objectId(req.params.commentId)) return res.status(400).json({ error: 'Invalid id' });
    const post = await CommunityPost.findById(req.params.postId);
    if (!post || post.status === 'removed') return res.status(404).json({ error: 'Post not found' });

    const comment = (post.comments || []).id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    comment.reported = true;
    await post.save();
    res.json({ message: 'Reported' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to report comment' });
  }
});

// Delete your own post (soft remove)
router.delete('/:id', authMiddleware, requireStudentJwt, async (req, res) => {
  try {
    const user = await loadStudent(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const post = await CommunityPost.findById(req.params.id);
    if (!post || post.status === 'removed') return res.status(404).json({ error: 'Post not found' });

    const isMine = post.authorId && String(post.authorId) === String(user._id);
    if (!isMine) return res.status(403).json({ error: 'You can only delete your own posts' });

    post.status = 'removed';
    await post.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
