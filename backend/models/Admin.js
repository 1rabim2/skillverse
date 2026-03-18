const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  name: { type: String, default: 'Admin' },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  googleSub: { type: String, unique: true, sparse: true, index: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
