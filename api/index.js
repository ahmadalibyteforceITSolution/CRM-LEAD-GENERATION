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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ahmedalihafeez25_db_user:%40Sublime12345@cluster0.oe0inne.mongodb.net/sale?retryWrites=true&w=majority';

let isConnected = false;

async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas (sale database)');
  } catch (error) {
    console.error('MongoDB Atlas Connection Error:', error.message);
  }
}

// Ensure DB connected on each request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting/Offline',
    databaseName: mongoose.connection.name || 'crm_lead_gen',
    timestamp: new Date().toISOString()
  });
});

// --- LEADS ENDPOINTS ---
// GET all real leads from MongoDB
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await LeadModel.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create real lead in MongoDB
app.post('/api/leads', async (req, res) => {
  try {
    const leadData = req.body;
    if (!leadData.id) {
      leadData.id = 'lead-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    }
    const newLead = await LeadModel.findOneAndUpdate(
      { id: leadData.id },
      leadData,
      { new: true, upsert: true }
    );
    res.status(201).json(newLead);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update lead in MongoDB
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

// DELETE lead from MongoDB
app.delete('/api/leads/:id', async (req, res) => {
  try {
    await LeadModel.findOneAndDelete({ id: req.params.id });
    await ActivityModel.deleteMany({ leadId: req.params.id });
    res.json({ success: true, message: 'Lead and activities deleted from database' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ACTIVITIES & LOGS ENDPOINTS ---
// GET chronological activities from MongoDB
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

// POST save activity / call / WhatsApp record into MongoDB
app.post('/api/activities', async (req, res) => {
  try {
    const actData = req.body;
    if (!actData.id) {
      actData.id = 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    }
    const newActivity = await ActivityModel.findOneAndUpdate(
      { id: actData.id },
      actData,
      { new: true, upsert: true }
    );
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

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend CRM API Server connected and listening on port ${PORT}`);
  });
}

export default app;
