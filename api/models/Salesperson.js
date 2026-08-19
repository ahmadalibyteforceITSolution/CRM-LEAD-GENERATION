import mongoose from 'mongoose';

const SalespersonSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: { type: String, default: '' },
  role: { type: String, default: 'Sales Representative' },
  activeLeadsCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

export const SalespersonModel = mongoose.models.Salesperson || mongoose.model('Salesperson', SalespersonSchema);
