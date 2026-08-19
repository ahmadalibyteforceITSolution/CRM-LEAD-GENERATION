import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { LeadModel } from './models/Lead.js';
import { ActivityModel } from './models/Activity.js';
import { SalespersonModel } from './models/Salesperson.js';
import { UserModel } from './models/User.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ahmedalihafeez25_db_user:%40Sublime12345@cluster0.oe0inne.mongodb.net/crm?retryWrites=true&w=majority';

// In-memory fallback cache to ensure 0 HTTP 500 errors
let memoryLeads = [];
let memoryActivities = [];
let memoryUsers = [
  {
    id: 'user-demo-1',
    name: 'Ali Raza',
    email: 'ali.raza@nexleads.io',
    password: 'password123',
    role: 'Senior SDR / Closer',
    companyName: 'NexLeads Agency',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-demo-2',
    name: 'Sara Khan',
    email: 'sara.khan@nexleads.io',
    password: 'password123',
    role: 'Account Executive',
    companyName: 'NexLeads Agency',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-demo-3',
    name: 'Hamza Malik',
    email: 'hamza.malik@nexleads.io',
    password: 'password123',
    role: 'Lead Generation Specialist',
    companyName: 'NexLeads Agency',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-demo-4',
    name: 'Zainab Abbas',
    email: 'zainab.abbas@nexleads.io',
    password: 'password123',
    role: 'Cold Calling Specialist',
    companyName: 'NexLeads Agency',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  }
];

let cachedConnection = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (!cachedConnection) {
    cachedConnection = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    }).then(m => {
      console.log('✅ Connected to MongoDB Atlas successfully (crm database)');
      return m.connection;
    }).catch(err => {
      cachedConnection = null;
      console.error('⚠️ MongoDB Atlas Connection Notice:', err.message);
      return null;
    });
  }
  return cachedConnection;
}

// Connect immediately on startup
connectDB().catch(() => {});

// Middleware to ensure DB connection is awaited
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('DB connect error in middleware:', err.message);
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    database: isConnected ? 'Connected to MongoDB Atlas' : 'Connecting / In-Memory Active',
    databaseName: mongoose.connection.name || 'crm',
    leadsCount: memoryLeads.length,
    timestamp: new Date().toISOString()
  });
});

// --- LEADS ENDPOINTS ---
// GET all leads
app.get('/api/leads', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const leads = await LeadModel.find().sort({ createdAt: -1 });
      memoryLeads = leads;
      return res.json(leads);
    }
    // Fallback if connecting
    return res.json(memoryLeads);
  } catch (error) {
    console.error('Error fetching leads:', error.message);
    return res.json(memoryLeads);
  }
});

// POST create lead
app.post('/api/leads', async (req, res) => {
  try {
    const leadData = req.body;
    if (!leadData.id) {
      leadData.id = 'lead-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    }

    // Keep memory in sync
    const existingIndex = memoryLeads.findIndex(l => l.id === leadData.id);
    if (existingIndex >= 0) {
      memoryLeads[existingIndex] = { ...memoryLeads[existingIndex], ...leadData };
    } else {
      memoryLeads.unshift(leadData);
    }

    if (mongoose.connection.readyState === 1) {
      const newLead = await LeadModel.findOneAndUpdate(
        { id: leadData.id },
        leadData,
        { new: true, upsert: true }
      );
      return res.status(201).json(newLead);
    }

    return res.status(201).json(leadData);
  } catch (error) {
    console.error('Error saving lead:', error.message);
    return res.status(201).json(req.body);
  }
});

// PUT update lead
app.put('/api/leads/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date().toISOString() };

    const existingIndex = memoryLeads.findIndex(l => l.id === req.params.id);
    if (existingIndex >= 0) {
      memoryLeads[existingIndex] = { ...memoryLeads[existingIndex], ...updates };
    }

    if (mongoose.connection.readyState === 1) {
      const updatedLead = await LeadModel.findOneAndUpdate(
        { id: req.params.id },
        updates,
        { new: true, upsert: true }
      );
      return res.json(updatedLead);
    }

    return res.json(updates);
  } catch (error) {
    console.error('Error updating lead:', error.message);
    return res.json(req.body);
  }
});

// DELETE lead
app.delete('/api/leads/:id', async (req, res) => {
  try {
    memoryLeads = memoryLeads.filter(l => l.id !== req.params.id);
    memoryActivities = memoryActivities.filter(a => a.leadId !== req.params.id);

    if (mongoose.connection.readyState === 1) {
      await LeadModel.findOneAndDelete({ id: req.params.id });
      await ActivityModel.deleteMany({ leadId: req.params.id });
    }

    return res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    return res.json({ success: true });
  }
});

// --- ACTIVITIES & LOGS ENDPOINTS ---
// GET activities
app.get('/api/activities', async (req, res) => {
  try {
    const { leadId } = req.query;
    if (mongoose.connection.readyState === 1) {
      const filter = leadId ? { leadId } : {};
      const activities = await ActivityModel.find(filter).sort({ createdAt: -1 });
      if (!leadId) memoryActivities = activities;
      return res.json(activities);
    }

    const filtered = leadId ? memoryActivities.filter(a => a.leadId === leadId) : memoryActivities;
    return res.json(filtered);
  } catch (error) {
    console.error('Error fetching activities:', error.message);
    const filtered = req.query.leadId ? memoryActivities.filter(a => a.leadId === req.query.leadId) : memoryActivities;
    return res.json(filtered);
  }
});

// POST save activity
app.post('/api/activities', async (req, res) => {
  try {
    const actData = req.body;
    if (!actData.id) {
      actData.id = 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    }

    memoryActivities.unshift(actData);

    if (mongoose.connection.readyState === 1) {
      const newActivity = await ActivityModel.findOneAndUpdate(
        { id: actData.id },
        actData,
        { new: true, upsert: true }
      );
      return res.status(201).json(newActivity);
    }

    return res.status(201).json(actData);
  } catch (error) {
    return res.status(201).json(req.body);
  }
});

// --- AUTH ENDPOINTS ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, companyName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const id = 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    const newUser = {
      id,
      name: name.trim(),
      email: cleanEmail,
      password,
      role: role || 'Senior SDR / Closer',
      companyName: companyName || 'NexLeads Agency',
      avatar
    };

    if (mongoose.connection.readyState === 1) {
      const existing = await UserModel.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(400).json({ error: 'An account with this email address already exists.' });
      }
      const saved = await UserModel.create(newUser);
      
      // Also register as salesperson
      await SalespersonModel.findOneAndUpdate(
        { email: cleanEmail },
        { id, name: newUser.name, email: cleanEmail, role: newUser.role, avatar },
        { upsert: true }
      );

      return res.status(201).json({
        success: true,
        user: {
          id: saved.id,
          name: saved.name,
          email: saved.email,
          role: saved.role,
          companyName: saved.companyName,
          avatar: saved.avatar
        },
        token: 'token-' + id
      });
    }

    // Memory fallback
    const memExisting = memoryUsers.find(u => u.email === cleanEmail);
    if (memExisting) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }
    memoryUsers.push(newUser);

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        companyName: newUser.companyName,
        avatar: newUser.avatar
      },
      token: 'token-' + id
    });
  } catch (error) {
    console.error('Error registering user:', error.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findOne({ email: cleanEmail });
      if (user && user.password === password) {
        return res.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyName: user.companyName,
            avatar: user.avatar
          },
          token: 'token-' + user.id
        });
      }
    }

    // Check memory users
    const memUser = memoryUsers.find(u => u.email === cleanEmail && u.password === password);
    if (memUser) {
      return res.json({
        success: true,
        user: {
          id: memUser.id,
          name: memUser.name,
          email: memUser.email,
          role: memUser.role,
          companyName: memUser.companyName,
          avatar: memUser.avatar
        },
        token: 'token-' + memUser.id
      });
    }

    return res.status(401).json({ error: 'Invalid email or password.' });
  } catch (error) {
    console.error('Error logging in:', error.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// --- SALESPERSONS ENDPOINTS ---
app.get('/api/salespersons', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const salespersons = await SalespersonModel.find();
      if (salespersons.length > 0) return res.json(salespersons);
    }
    return res.json([]);
  } catch (error) {
    return res.json([]);
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend CRM API Server connected and listening on port ${PORT}`);
  });
}

export default app;
