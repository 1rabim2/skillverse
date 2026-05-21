const mongoose = require('mongoose');

const ChatThreadSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastMessageAt: { type: Date, default: null, index: true },
    lastMessageText: { type: String, default: '' }
  },
  { timestamps: true }
);

// One chat thread per (course, student). Mentor is derived from the course owner.
ChatThreadSchema.index({ course: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('ChatThread', ChatThreadSchema);

