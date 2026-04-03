const mongoose = require('mongoose');

const ProjectSubmissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lessonId: { type: String, required: true, trim: true, index: true },
    lessonTitle: { type: String, default: '' },
    repoUrl: { type: String, default: '' },
    demoUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'needs_changes', 'approved'],
      default: 'draft',
      index: true
    },
    feedback: { type: String, default: '' },
    attachments: {
      type: [
        {
          fileName: { type: String, required: true },
          originalName: { type: String, default: '' },
          mime: { type: String, default: '' },
          size: { type: Number, default: 0 },
          uploadedAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
  },
  { timestamps: true }
);

ProjectSubmissionSchema.index({ user: 1, course: 1, lessonId: 1 }, { unique: true });

module.exports = mongoose.model('ProjectSubmission', ProjectSubmissionSchema);
