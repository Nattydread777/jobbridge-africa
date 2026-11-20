import mongoose from 'mongoose';

const cvUsageSchema = new mongoose.Schema({
  identityHash: { type: String, required: true },
  dayKey: { type: String, required: true },
  count: { type: Number, default: 0, min: 0 },
  aiCount: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

cvUsageSchema.index({ identityHash: 1, dayKey: 1 }, { unique: true });

export default mongoose.model('CvUsage', cvUsageSchema);
