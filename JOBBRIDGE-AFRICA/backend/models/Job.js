import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  companyName: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  department: { type: String, default: '' },
  location: { type: String, required: true },
  jobType: {
    type: String,
    enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote'],
    default: 'Full-Time',
  },
  workplaceType: {
    type: String,
    enum: ['remote', 'hybrid', 'on-site'],
    default: function defaultWorkplaceType() {
      if (!this) return 'on-site';
      return this.jobType === 'Remote' ? 'remote' : 'on-site';
    },
  },
  salaryRange: { type: String, default: 'Competitive' },
  description: { type: String, required: true },
  requirements: { type: String }, // Changed from array to string for easier text input
  responsibilities: { type: String },
  benefits: { type: String },
  expiryDate: { type: Date, required: true }, // Job application deadline
  applicationEmail: { type: String },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isApproved: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  source: { type: String, enum: ['employer', 'himalayas', 'remotive', 'aggregated'], default: 'employer' },
  sourceProvider: { type: String, default: '' },
  sourceName: { type: String, default: '' },
  sourceUrl: { type: String, default: '' },
  isDirectPosting: {
    type: Boolean,
    default: function isDirectPostingBySource() {
      if (!this) return true;
      return this.source === 'employer';
    },
  },
  isRemote: {
    type: Boolean,
    default: function isRemoteBySource() {
      if (!this) return false;
      return this.workplaceType === 'remote' || this.jobType === 'Remote';
    },
  },
  isWorldwideRemote: { type: Boolean, default: false },
  sourceKey: { type: String, unique: true, sparse: true },
  companySlug: { type: String, default: '' },
  excerpt: { type: String, default: '' },
  applicationLink: { type: String, default: '' },
  locationRestriction: { type: String, default: '' },
  seniority: { type: String, default: '' },
  salary: { type: String, default: '' },
  categories: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  pubDate: { type: Date },
  lastSeenAt: { type: Date },
}, { timestamps: true });

// Virtual property to check if job is expired
jobSchema.virtual('isExpired').get(function() {
  return this.expiryDate && new Date() > this.expiryDate;
});

// Ensure virtuals are included when converting to JSON
jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

const Job = mongoose.model('Job', jobSchema);
export default Job;
