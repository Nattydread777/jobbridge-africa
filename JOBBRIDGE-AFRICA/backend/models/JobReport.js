import mongoose from 'mongoose';

const jobReportSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  reason: {
    type: String,
    enum: ['scam', 'misleading', 'expired', 'inaccurate', 'other'],
    required: true,
  },
  details: { type: String, default: '', maxlength: 2000 },
  email: { type: String, default: '', lowercase: true, trim: true, maxlength: 254 },
  status: { type: String, enum: ['open', 'reviewed'], default: 'open' },
}, { timestamps: true });

const JobReport = mongoose.model('JobReport', jobReportSchema);
export default JobReport;
