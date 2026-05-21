const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatThread', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 }
  },
  { timestamps: true }
);

ChatMessageSchema.index({ thread: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);

