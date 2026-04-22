const mongoose = require('mongoose');

const QuizQuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true, min: 0 },
    explanation: { type: String, default: '' }
  },
  { _id: true }
);

const LessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['reading', 'video', 'quiz', 'project'], default: 'reading' },
    content: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    resourceLink: { type: String, default: '' },
    durationMin: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    quiz: {
      passPercent: { type: Number, default: 60, min: 0, max: 100 },
      questions: { type: [QuizQuestionSchema], default: [] }
    }
  },
  { _id: true }
);

const ChapterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    lessons: { type: [LessonSchema], default: [] }
  },
  { _id: true }
);

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'General' },
  description: { type: String, default: '' },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  isApproved: { type: Boolean, default: false, index: true },
  approvalRequestedAt: { type: Date, default: null, index: true },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  videoUrl: { type: String, default: '' },
  resourceLink: { type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  chapters: { type: [ChapterSchema], default: [] },
  skillPath: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillPath', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
