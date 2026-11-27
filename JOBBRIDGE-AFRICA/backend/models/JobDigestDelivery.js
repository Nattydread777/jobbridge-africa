import mongoose from 'mongoose';

const jobDigestDeliverySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  status: { type: String, enum: ['sending', 'sent', 'failed'], required: true },
  frequency: { type: String, enum: ['instant', 'daily', 'weekly'], required: true },
  matchScore: { type: Number, min: 0, max: 1 },
  sentAt: { type: Date },
  nextAttemptAt: { type: Date },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, maxlength: 500 },
}, { timestamps: true });

jobDigestDeliverySchema.index({ userId: 1, jobId: 1 }, { unique: true });
jobDigestDeliverySchema.index({ userId: 1, status: 1, nextAttemptAt: 1 });

export default mongoose.model('JobDigestDelivery', jobDigestDeliverySchema);
