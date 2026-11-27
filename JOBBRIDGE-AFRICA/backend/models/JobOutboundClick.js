import mongoose from 'mongoose';

const jobOutboundClickSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  source: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  linkType: { type: String, enum: ['application', 'source'], required: true },
  timestamp: { type: Date, default: Date.now, required: true },
}, { versionKey: false });

jobOutboundClickSchema.index({ timestamp: -1 });
jobOutboundClickSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model('JobOutboundClick', jobOutboundClickSchema);
