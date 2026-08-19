import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Senior SDR / Closer' },
  companyName: { type: String, default: 'NexLeads Agency' },
  avatar: { type: String, default: '' }
}, {
  timestamps: true
});

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
