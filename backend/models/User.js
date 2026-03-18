const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  isActive: { type: Boolean, default: true },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  progress: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    percent: { type: Number, default: 0 },
    completedAt: { type: Date },
    completedLessons: [{
      lessonId: { type: String },
      completedAt: { type: Date, default: Date.now }
    }],
    quizAttempts: [{
      lessonId: { type: String },
      scorePercent: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      passed: { type: Boolean, default: false },
      answers: [{ type: Number }],
      attemptedAt: { type: Date, default: Date.now }
    }]
  }],
  certificates: [{
    certificateId: { type: String },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    issuedAt: { type: Date, default: Date.now }
  }],
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
