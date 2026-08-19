import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  leadId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  channel: { type: String, required: true },
  salesperson: { type: String, required: true },
  attendedOrResponded: { type: String, required: true },
  status: { type: String, required: true },
  notes: { type: String, default: '' },
  nextFollowUp: { type: String, default: '' },
  type: { type: String, default: 'note' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true
});

export const ActivityModel = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
