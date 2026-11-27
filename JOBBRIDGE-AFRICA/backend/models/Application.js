import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  job: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job', 
    required: true 
  },
  applicant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  tailoredCv: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TailoredCv',
  },
  tailoredCvDeletedAt: { type: Date },
  coverLetter: { 
    type: String 
  },
  resumeUrl: { 
    type: String, 
    default: ''
  },
  resumePublicId: { 
    type: String 
  },
  resumeDeletedAt: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'],
    default: 'pending'
  },
  candidateStage: {
    type: String,
    enum: ['applied', 'interviewing', 'in_review', 'offer', 'rejected'],
    default: 'applied',
    select: false,
  },
  candidateNotes: { type: String, default: '', maxlength: 2000, select: false },
  appliedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index to prevent duplicate applications
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);
export default Application;
