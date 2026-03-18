const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipientType: { type: String, enum: ['user', 'admin'], required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, default: 'info', index: true },
    title: { type: String, default: '' },
    message: { type: String, required: true },
    link: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientType: 1, recipient: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);

