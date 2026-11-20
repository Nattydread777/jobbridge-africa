import mongoose from 'mongoose';

const tailoredCvSchema = new mongoose.Schema({
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  sections: { type: mongoose.Schema.Types.Mixed, required: true },
  source: { type: String, enum: ['rule_based', 'ai_assisted'], default: 'ai_assisted' },
}, { timestamps: true });

tailoredCvSchema.index({ applicant: 1, job: 1 }, { unique: true });

export default mongoose.model('TailoredCv', tailoredCvSchema);
