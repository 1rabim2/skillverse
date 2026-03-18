const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  scorePercent: { type: Number, default: null },
  passPercent: { type: Number, default: null },
  issuedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', CertificateSchema);
