import mongoose from 'mongoose';

const externalApplicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobTitle: { type: String, required: true, trim: true },
  companyName: { type: String, required: true, trim: true },
  location: { type: String, default: '' },
  source: { type: String, required: true, trim: true },
  applicationLink: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now, required: true },
  candidateStage: {
    type: String,
    enum: ['applied', 'interviewing', 'in_review', 'offer', 'rejected'],
    default: 'applied',
  },
  candidateNotes: { type: String, default: '', maxlength: 2000 },
}, { timestamps: true });

externalApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
externalApplicationSchema.index({ applicant: 1, appliedAt: -1 });

export default mongoose.model('ExternalApplication', externalApplicationSchema);
