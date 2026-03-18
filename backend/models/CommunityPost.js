const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  authorName: { type: String, required: true },
  content: { type: String, required: true },
  reported: { type: Boolean, default: false }
}, { timestamps: true });

const CommunityPostSchema = new mongoose.Schema({
  authorName: { type: String, required: true },
  content: { type: String, required: true },
  reported: { type: Boolean, default: false },
  status: { type: String, enum: ['approved', 'pending', 'removed'], default: 'approved' },
  comments: [CommentSchema]
}, { timestamps: true });

module.exports = mongoose.model('CommunityPost', CommunityPostSchema);
