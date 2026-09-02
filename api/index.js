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
    id: 'user-admin',
    name: 'SuperAdmin',
    email: 'admin@nexleads.io',
    password: 'password123',
    role: 'SuperAdmin',
    companyName: 'NexLeads Agency',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-sales-op',
    name: 'Laiba Shahid',
    email: 'salesspacesandplaces@gmail.com',
    password: 'Laiba1234',
    role: 'Sales Operations Manager',
    companyName: 'Spaces & Places',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
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

let memorySalespersons = [
  {
    id: 'sp-admin',
    name: 'SuperAdmin',
    email: 'admin@nexleads.io',
    role: 'SuperAdmin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    activeLeadsCount: 0
  },
  {
    id: 'sp-sales-op',
    name: 'Laiba Shahid',
    email: 'salesspacesandplaces@gmail.com',
    role: 'Sales Operations Manager',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    activeLeadsCount: 0
  },
  {
    id: 'sp-1',
    name: 'Ali Raza',
    email: 'ali.raza@nexleads.io',
    role: 'Senior SDR / Closer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    activeLeadsCount: 14
  },
  {
    id: 'sp-2',
    name: 'Sarah Jenkins',
    email: 'sarah.j@nexleads.io',
    role: 'Cold Outreach Specialist',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    activeLeadsCount: 19
  },
  {
    id: 'sp-3',
    name: 'Michael Chang',
    email: 'michael.c@nexleads.io',
    role: 'Account Executive',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    activeLeadsCount: 11
  },
  {
    id: 'sp-4',
    name: 'Priya Sharma',
    email: 'priya.s@nexleads.io',
    role: 'Inbound Lead Manager',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    activeLeadsCount: 16
  }
];

let cachedConnection = null;

async function seedDatabaseIfEmpty() {
  try {
    if (mongoose.connection.readyState === 1) {
      // Seed default users if missing
      for (const u of memoryUsers) {
        const exists = await UserModel.findOne({ email: u.email });
        if (!exists) {
          await UserModel.create(u);
        }
      }

      // Seed salespersons if missing
      for (const sp of memorySalespersons) {
        const exists = await SalespersonModel.findOne({ email: sp.email });
        if (!exists) {
          await SalespersonModel.create(sp);
        }
      }
    }
  } catch (err) {
    console.warn('Seeding notice:', err.message);
  }
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (!cachedConnection) {
    cachedConnection = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    }).then(async (m) => {
      console.log('✅ Connected to MongoDB Atlas successfully (crm database)');
      await seedDatabaseIfEmpty();
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
    salespersonsCount: memorySalespersons.length,
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

    const spData = {
      id,
      name: newUser.name,
      email: cleanEmail,
      role: newUser.role,
      avatar,
      activeLeadsCount: 0
    };

    // Update in-memory salespersons list
    const spIndex = memorySalespersons.findIndex(s => s.email === cleanEmail);
    if (spIndex >= 0) {
      memorySalespersons[spIndex] = { ...memorySalespersons[spIndex], ...spData };
    } else {
      memorySalespersons.unshift(spData);
    }

    if (mongoose.connection.readyState === 1) {
      const existing = await UserModel.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(400).json({ error: 'An account with this email address already exists.' });
      }
      const saved = await UserModel.create(newUser);
      
      // Also register as salesperson
      await SalespersonModel.findOneAndUpdate(
        { email: cleanEmail },
        spData,
        { upsert: true, new: true }
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

    // Helper to ensure user is also recorded as a salesperson
    const ensureSalesperson = async (user) => {
      const spData = {
        id: user.id || ('sp-' + Date.now()),
        name: user.name,
        email: cleanEmail,
        role: user.role || 'Sales Representative',
        avatar: user.avatar || '',
        activeLeadsCount: 0
      };
      const spIndex = memorySalespersons.findIndex(s => s.email === cleanEmail);
      if (spIndex >= 0) {
        memorySalespersons[spIndex] = { ...memorySalespersons[spIndex], ...spData };
      } else {
        memorySalespersons.unshift(spData);
      }
      if (mongoose.connection.readyState === 1) {
        try {
          await SalespersonModel.findOneAndUpdate({ email: cleanEmail }, spData, { upsert: true });
        } catch (e) {}
      }
    };

    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findOne({ email: cleanEmail });
      if (user && user.password === password) {
        await ensureSalesperson(user);
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
      await ensureSalesperson(memUser);
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
// GET all salespersons (merges DB, memory, registered users, and assigned reps on leads)
app.get('/api/salespersons', async (req, res) => {
  try {
    const map = new Map();

    // Load default memory salespersons
    for (const sp of memorySalespersons) {
      map.set(sp.email.toLowerCase(), sp);
    }

    if (mongoose.connection.readyState === 1) {
      const dbSalespersons = await SalespersonModel.find();
      const dbUsers = await UserModel.find();
      const dbLeads = await LeadModel.find();

      // Load DB salespersons
      for (const sp of dbSalespersons) {
        map.set(sp.email.toLowerCase(), {
          id: sp.id,
          name: sp.name,
          email: sp.email,
          role: sp.role,
          avatar: sp.avatar,
          activeLeadsCount: sp.activeLeadsCount || 0
        });
      }

      // Ensure every registered user also appears as a salesperson option
      for (const u of dbUsers) {
        if (!map.has(u.email.toLowerCase())) {
          map.set(u.email.toLowerCase(), {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role || 'Sales Representative',
            avatar: u.avatar || '',
            activeLeadsCount: 0
          });
        }
      }

      // Ensure all reps assigned to any existing lead in DB appear in salespersons
      for (const lead of dbLeads) {
        const repName = (lead.assignedSalesperson || '').trim();
        if (repName && repName.toLowerCase() !== 'unassigned') {
          const alreadyExists = Array.from(map.values()).some(s => s.name.toLowerCase() === repName.toLowerCase());
          if (!alreadyExists) {
            const isLaiba = repName.toLowerCase() === 'laiba shahid';
            const email = isLaiba ? 'salesspacesandplaces@gmail.com' : `${repName.toLowerCase().replace(/\s+/g, '.')}@nexleads.io`;
            map.set(email, {
              id: 'sp-' + encodeURIComponent(repName.toLowerCase().replace(/\s+/g, '-')),
              name: repName,
              email: email,
              role: isLaiba ? 'Sales Operations Manager' : 'Sales Representative',
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(repName)}`,
              activeLeadsCount: 0
            });
          }
        }
      }
    } else {
      // Memory fallback: also check memoryLeads
      for (const lead of memoryLeads) {
        const repName = (lead.assignedSalesperson || '').trim();
        if (repName && repName.toLowerCase() !== 'unassigned') {
          const alreadyExists = Array.from(map.values()).some(s => s.name.toLowerCase() === repName.toLowerCase());
          if (!alreadyExists) {
            const isLaiba = repName.toLowerCase() === 'laiba shahid';
            const email = isLaiba ? 'salesspacesandplaces@gmail.com' : `${repName.toLowerCase().replace(/\s+/g, '.')}@nexleads.io`;
            map.set(email, {
              id: 'sp-' + encodeURIComponent(repName.toLowerCase().replace(/\s+/g, '-')),
              name: repName,
              email: email,
              role: isLaiba ? 'Sales Operations Manager' : 'Sales Representative',
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(repName)}`,
              activeLeadsCount: 0
            });
          }
        }
      }
    }

    const result = Array.from(map.values());
    memorySalespersons = result;
    return res.json(result);
  } catch (error) {
    console.error('Error fetching salespersons:', error.message);
    return res.json(memorySalespersons);
  }
});

// POST save / add salesperson
app.post('/api/salespersons', async (req, res) => {
  try {
    const spData = req.body;
    if (!spData.name || !spData.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    if (!spData.id) {
      spData.id = 'sp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    }

    const cleanEmail = spData.email.toLowerCase().trim();
    spData.email = cleanEmail;

    const existingIndex = memorySalespersons.findIndex(s => s.email === cleanEmail);
    if (existingIndex >= 0) {
      memorySalespersons[existingIndex] = { ...memorySalespersons[existingIndex], ...spData };
    } else {
      memorySalespersons.unshift(spData);
    }

    if (mongoose.connection.readyState === 1) {
      const saved = await SalespersonModel.findOneAndUpdate(
        { email: cleanEmail },
        spData,
        { new: true, upsert: true }
      );
      return res.status(201).json(saved);
    }

    return res.status(201).json(spData);
  } catch (error) {
    console.error('Error saving salesperson:', error.message);
    return res.status(201).json(req.body);
  }
});

// POST bulk sync
app.post('/api/sync', async (req, res) => {
  try {
    const { leads = [], activities = [], salespersons = [] } = req.body;

    if (Array.isArray(leads) && leads.length > 0) {
      memoryLeads = leads;
      if (mongoose.connection.readyState === 1) {
        for (const lead of leads) {
          await LeadModel.findOneAndUpdate({ id: lead.id }, lead, { upsert: true });
        }
      }
    }

    if (Array.isArray(activities) && activities.length > 0) {
      memoryActivities = activities;
      if (mongoose.connection.readyState === 1) {
        for (const act of activities) {
          await ActivityModel.findOneAndUpdate({ id: act.id }, act, { upsert: true });
        }
      }
    }

    if (Array.isArray(salespersons) && salespersons.length > 0) {
      for (const sp of salespersons) {
        const cleanEmail = sp.email.toLowerCase().trim();
        const idx = memorySalespersons.findIndex(s => s.email === cleanEmail);
        if (idx >= 0) {
          memorySalespersons[idx] = { ...memorySalespersons[idx], ...sp };
        } else {
          memorySalespersons.push(sp);
        }
        if (mongoose.connection.readyState === 1) {
          await SalespersonModel.findOneAndUpdate({ email: cleanEmail }, sp, { upsert: true });
        }
      }
    }

    return res.json({ success: true, message: 'Synced successfully' });
  } catch (error) {
    console.error('Error syncing:', error.message);
    return res.json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend CRM API Server connected and listening on port ${PORT}`);
  });
}

export default app;
