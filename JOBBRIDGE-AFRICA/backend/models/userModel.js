import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
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
  bio: { type: String, maxlength: 300 },
  profileImageUrl: { type: String },
  profileImagePublicId: { type: String },
  resumeUrl: { type: String },
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
