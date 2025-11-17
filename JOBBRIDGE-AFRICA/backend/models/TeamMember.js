import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide team member name'],
    trim: true,
  },
  role: {
    type: String,
    required: [true, 'Please provide role/title'],
    trim: true,
  },
  bio: {
    type: String,
    default: '',
    maxLength: 500,
  },
  photoUrl: {
    type: String,
    default: '',
  },
  linkedIn: {
    type: String,
    default: '',
  },
  github: {
    type: String,
    default: '',
  },
  twitter: {
    type: String,
    default: '',
  },
  order: {
    type: Number,
    default: 0, // For controlling display order
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const TeamMember = mongoose.model('TeamMember', teamMemberSchema);

export default TeamMember;
