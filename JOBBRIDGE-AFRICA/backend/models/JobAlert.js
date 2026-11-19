import mongoose from 'mongoose';

const jobAlertSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  keyword: { type: String, default: '', maxlength: 120 },
  location: { type: String, default: '', maxlength: 120 },
  remote: { type: Boolean, default: null },
  jobType: { type: String, default: '', maxlength: 40 },
  category: { type: String, default: '', maxlength: 80 },
  consentedAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const JobAlert = mongoose.model('JobAlert', jobAlertSchema);
export default JobAlert;
