import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  emailVerified: { type: Boolean, default: true },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  accountDeletedAt: { type: Date, select: false },
  termsAcceptedAt: { type: Date },
  privacyAcceptedAt: { type: Date },
  role: {
    type: String,
    enum: ['job_seeker', 'employer', 'admin'],
    default: 'job_seeker',
  },
  companyName: {
    type: String,
    required: [
      function () {
        return this.role === 'employer';
      },
      'Company name is required for employers.',
    ],
  },
  country: { type: String },
  phone: { type: String, trim: true },
  bio: { type: String, maxlength: 1200 },
  profileImageUrl: { type: String },
  profileImagePublicId: { type: String },
  resumeUrl: { type: String },
  resumePublicId: { type: String },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  education: [{
    school: String,
    degree: String,
    field: String,
    startYear: String,
    endYear: String,
  }],
  experience: [{
    company: String,
    position: String,
    location: String,
    startDate: String,
    endDate: String,
    description: String,
  }],
  skills: [String],
  skillGroups: {
    core: { type: [String], default: [] },
    tools: { type: [String], default: [] },
    technical: { type: [String], default: [] },
  },
  certifications: [{
    name: String,
    issuer: String,
    issueDate: String,
    credentialUrl: String,
  }],
  projects: [{
    name: String,
    description: String,
    url: String,
  }],
  workPreferences: {
    workModes: { type: [String], default: [] },
    targetRoles: { type: [String], default: [] },
    preferredLocations: { type: [String], default: [] },
    willingToRelocate: { type: Boolean, default: false },
  },
  jobAlertPreferences: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['instant', 'daily', 'weekly'], default: 'daily' },
    unsubscribeVersion: {
      type: String,
      default: () => randomBytes(24).toString('hex'),
      select: false,
    },
    unsubscribedAt: { type: Date, select: false },
    welcomeDigestSentAt: { type: Date, select: false },
    lastDigestAt: { type: Date, select: false },
    lastDigestCheckAt: { type: Date, select: false },
    digestLockToken: { type: String, select: false },
    digestLockUntil: { type: Date, select: false },
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
