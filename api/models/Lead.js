import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  companyName: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  whatsAppNumber: { type: String, default: '' },
  email: { type: String, default: '' },
  industry: { type: String, default: 'General' },
  city: { type: String, default: '' },
  fullAddress: { type: String, default: '' },
  serviceRequired: { type: String, default: 'Lead Generation' },
  leadSource: { type: String, default: 'Google Maps' },
  dateLeadAdded: { type: String, default: () => new Date().toISOString().split('T')[0] },
  notes: { type: String, default: '' },
  dealValue: { type: Number, default: 0 },

  stage: { type: String, default: 'New Lead' },
  priority: { type: String, default: 'Cold' },

  assignedSalesperson: { type: String, default: 'Ali Raza' },
  assignedDate: { type: String, default: '' },
  assignedTime: { type: String, default: '' },
  assignedBy: { type: String, default: '' },
  territory: { type: String, default: 'General' },
  currentOwner: { type: String, default: 'Ali Raza' },
  lastContactedBy: { type: String, default: '' },
  lastContactDate: { type: String, default: '' },
  lastContactTime: { type: String, default: '' },
  nextFollowUpOwner: { type: String, default: 'Ali Raza' },

  nextAction: { type: String, default: 'Initial Cold Outreach' },
  nextFollowUpDate: { type: String, default: '' },
  nextFollowUpTime: { type: String, default: '14:00' },
  preferredChannel: { type: String, default: 'Cold Call' },

  totalCalls: { type: Number, default: 0 },
  totalWhatsApp: { type: Number, default: 0 },
  tags: [{ type: String }],
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true
});

export const LeadModel = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
