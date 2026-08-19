import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { LeadModel } from './models/Lead.js';
import { ActivityModel } from './models/Activity.js';
import { SalespersonModel } from './models/Salesperson.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://test:test@cluster0.mongodb.net/crm_lead_gen?retryWrites=true&w=majority';

let isConnected = false;

async function connectDB() {
  if (isConnected || mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    isConnected = true;
    console.log('MongoDB Atlas Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
  }
}

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// --- LEADS ENDPOINTS ---
// GET all leads
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await LeadModel.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create lead
app.post('/api/leads', async (req, res) => {
  try {
    const newLead = new LeadModel(req.body);
    await newLead.save();
    res.status(201).json(newLead);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update lead
app.put('/api/leads/:id', async (req, res) => {
  try {
    const updatedLead = await LeadModel.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date().toISOString() },
      { new: true, upsert: true }
    );
    res.json(updatedLead);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE lead
app.delete('/api/leads/:id', async (req, res) => {
  try {
    await LeadModel.findOneAndDelete({ id: req.params.id });
    await ActivityModel.deleteMany({ leadId: req.params.id });
    res.json({ message: 'Lead and associated activities deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ACTIVITIES ENDPOINTS ---
// GET activities
app.get('/api/activities', async (req, res) => {
  try {
    const { leadId } = req.query;
    const filter = leadId ? { leadId } : {};
    const activities = await ActivityModel.find(filter).sort({ createdAt: -1 });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add activity
app.post('/api/activities', async (req, res) => {
  try {
    const newActivity = new ActivityModel(req.body);
    await newActivity.save();
    res.status(201).json(newActivity);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- SALESPERSONS ENDPOINTS ---
app.get('/api/salespersons', async (req, res) => {
  try {
    const salespersons = await SalespersonModel.find();
    res.json(salespersons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk sync endpoint
app.post('/api/sync', async (req, res) => {
  try {
    const { leads, activities, salespersons } = req.body;
    if (leads && Array.isArray(leads)) {
      for (const lead of leads) {
        await LeadModel.findOneAndUpdate({ id: lead.id }, lead, { upsert: true });
      }
    }
    if (activities && Array.isArray(activities)) {
      for (const act of activities) {
        await ActivityModel.findOneAndUpdate({ id: act.id }, act, { upsert: true });
      }
    }
    if (salespersons && Array.isArray(salespersons)) {
      for (const sp of salespersons) {
        await SalespersonModel.findOneAndUpdate({ id: sp.id }, sp, { upsert: true });
      }
    }
    res.json({ success: true, message: 'Database synced successfully with MongoDB' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend CRM API Server running on port ${PORT}`);
  });
}

export default app;
