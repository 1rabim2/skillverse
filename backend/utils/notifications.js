const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const User = require('../models/User');

function objectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function createNotification({ recipientType, recipientId, type = 'info', title = '', message, link = '', meta = {} }) {
  if (!message) return null;
  if (!recipientType || !recipientId) return null;
  if (!objectId(recipientId)) return null;
  return Notification.create({
    recipientType,
    recipient: recipientId,
    type,
    title,
    message,
    link,
    meta
  });
}

async function notifyUser(userId, payload) {
  return createNotification({ recipientType: 'user', recipientId: userId, ...payload });
}

async function notifyAdmin(adminId, payload) {
  return createNotification({ recipientType: 'admin', recipientId: adminId, ...payload });
}

async function notifyAllAdmins(payload) {
  const admins = await Admin.find({ isActive: true }).select('_id');
  await Promise.all(admins.map((a) => notifyAdmin(a._id, payload).catch(() => null)));
}

async function notifyManyUsers(userIds, payload) {
  const ids = Array.isArray(userIds) ? userIds.filter((id) => objectId(id)) : [];
  await Promise.all(ids.map((id) => notifyUser(id, payload).catch(() => null)));
}

async function notifyAllStudents(payload, { limit = 250 } = {}) {
  const users = await User.find({ role: 'student', isActive: true, isVerified: true }).select('_id').sort({ createdAt: -1 }).limit(limit);
  await Promise.all(users.map((u) => notifyUser(u._id, payload).catch(() => null)));
}

module.exports = {
  notifyUser,
  notifyAdmin,
  notifyAllAdmins,
  notifyManyUsers,
  notifyAllStudents
};

