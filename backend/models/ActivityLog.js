const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  type: { type: String, required: true },
  message: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
