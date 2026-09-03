import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import { LeadModel } from './models/Lead.js';
import { ActivityModel } from './models/Activity.js';
import { SalespersonModel } from './models/Salesperson.js';
import { UserModel } from './models/User.js';

// Configure reliable DNS servers to prevent querySrv ECONNREFUSED with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Helper to convert any Mongoose document or wrapped object into a clean, plain JS object
function toPlainObject(doc) {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') {
    return doc.toObject();
  }
  let plain = doc;
  if (doc._doc) {
    plain = { ...doc._doc, ...doc };
  } else {
    plain = { ...doc };
  }
  delete plain.$__;
  delete plain._doc;
  delete plain.paths;
  delete plain.$locals;
  delete plain.$op;
  delete plain.isNew;
  return plain;
}

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
  }
];

let cachedConnection = null;

function cleanAndNormalizeSalespersons(list) {
  const map = new Map();
  const blockedDemoNames = ['ali raza', 'sarah jenkins', 'michael chang', 'priya sharma', 'sara khan', 'hamza malik', 'zainab abbas'];
  for (const item of list) {
    if (!item || !item.name) continue;
    let name = item.name.trim();
    let email = (item.email || '').toLowerCase().trim();
    let role = item.role || 'Sales Representative';
    let avatar = item.avatar || '';

    // Ignore old demo names
    if (blockedDemoNames.includes(name.toLowerCase())) continue;

    // Normalize any variation of Laiba (Sales Ops) to ONLY Laiba Shahid
    if (name.toLowerCase().includes('laiba') || email === 'salesspacesandplaces@gmail.com') {
      name = 'Laiba Shahid';
      email = 'salesspacesandplaces@gmail.com';
      role = 'Sales Operations Manager';
      avatar = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80';
    }

    if (name.toLowerCase() === 'superadmin' || email === 'admin@nexleads.io') {
      name = 'SuperAdmin';
      email = 'admin@nexleads.io';
      role = 'SuperAdmin';
      avatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80';
    }

    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        id: item.id || ('sp-' + encodeURIComponent(key.replace(/\s+/g, '-'))),
        name,
        email: email || `${key.replace(/\s+/g, '.')}@nexleads.io`,
        role,
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        activeLeadsCount: item.activeLeadsCount || 0
      });
    }
  }
  return Array.from(map.values());
}

async function seedDatabaseIfEmpty() {
  try {
    if (mongoose.connection.readyState === 1) {
      // Purge all old demo salespeople and users
      const demoNames = ['Ali Raza', 'Sarah Jenkins', 'Michael Chang', 'Priya Sharma', 'Sara Khan', 'Hamza Malik', 'Zainab Abbas', 'Laiba (Sales Ops)'];
      await SalespersonModel.deleteMany({ name: { $in: demoNames } });
      await UserModel.deleteMany({ name: { $in: demoNames } });
      await SalespersonModel.deleteMany({ name: /Sales Ops/i });
      await UserModel.deleteMany({ name: /Sales Ops/i });

      // Reassign any existing lead with an old demo assigned salesperson to 'Laiba Shahid'
      await LeadModel.updateMany(
        { assignedSalesperson: { $in: ['Ali Raza', 'Sarah Jenkins', 'Michael Chang', 'Priya Sharma', 'Laiba (Sales Ops)'] } },
        { assignedSalesperson: 'Laiba Shahid', currentOwner: 'Laiba Shahid', nextFollowUpOwner: 'Laiba Shahid' }
      );

      // Seed default users if missing
      for (const u of memoryUsers) {
        const exists = await UserModel.findOne({ email: u.email });
        if (!exists) {
          await UserModel.create(u);
        } else if (u.name === 'Laiba Shahid' && exists.name !== 'Laiba Shahid') {
          await UserModel.updateOne({ email: u.email }, { name: 'Laiba Shahid' });
        }
      }

      // Seed salespersons if missing
      for (const sp of memorySalespersons) {
        const exists = await SalespersonModel.findOne({ email: sp.email });
        if (!exists) {
          await SalespersonModel.create(sp);
        } else if (sp.name === 'Laiba Shahid' && exists.name !== 'Laiba Shahid') {
          await SalespersonModel.updateOne({ email: sp.email }, { name: 'Laiba Shahid' });
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
      const leads = await LeadModel.find().sort({ createdAt: -1 }).lean();
      memoryLeads = leads.map(toPlainObject);
      return res.json(memoryLeads);
    }
    // Fallback if connecting
    return res.json(memoryLeads.map(toPlainObject));
  } catch (error) {
    console.error('Error fetching leads:', error.message);
    return res.json(memoryLeads.map(toPlainObject));
  }
});

// POST create lead
app.post('/api/leads', async (req, res) => {
  try {
    const leadData = toPlainObject(req.body);
    if (!leadData.id) {
      leadData.id = 'lead-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    }

    const rep = (leadData.assignedSalesperson || 'SuperAdmin').trim();
    leadData.assignedSalesperson = rep;
    if (!leadData.currentOwner) leadData.currentOwner = rep;
    if (!leadData.nextFollowUpOwner) leadData.nextFollowUpOwner = rep;
    if (!leadData.assignedBy) leadData.assignedBy = rep;
    if (!leadData.createdAt) leadData.createdAt = new Date().toISOString();
    leadData.updatedAt = new Date().toISOString();

    if (mongoose.connection.readyState === 1) {
      const newLead = await LeadModel.findOneAndUpdate(
        { id: leadData.id },
        { $set: leadData },
        { new: true, upsert: true, lean: true }
      );
      const cleanSaved = toPlainObject(newLead);
      const existingIndex = memoryLeads.findIndex(l => l.id === leadData.id);
      if (existingIndex >= 0) {
        memoryLeads[existingIndex] = cleanSaved;
      } else {
        memoryLeads.unshift(cleanSaved);
      }
      return res.status(201).json(cleanSaved);
    }

    // Keep memory in sync
    const existingIndex = memoryLeads.findIndex(l => l.id === leadData.id);
    if (existingIndex >= 0) {
      memoryLeads[existingIndex] = { ...memoryLeads[existingIndex], ...leadData };
    } else {
      memoryLeads.unshift(leadData);
    }

    return res.status(201).json(leadData);
  } catch (error) {
    console.error('Error saving lead:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// PUT update lead
app.put('/api/leads/:id', async (req, res) => {
  try {
    const updates = toPlainObject(req.body);
    updates.updatedAt = new Date().toISOString();

    if (updates.assignedSalesperson) {
      updates.assignedSalesperson = updates.assignedSalesperson.trim();
      if (!updates.currentOwner) updates.currentOwner = updates.assignedSalesperson;
      if (!updates.nextFollowUpOwner) updates.nextFollowUpOwner = updates.assignedSalesperson;
    }

    if (mongoose.connection.readyState === 1) {
      const updatedLead = await LeadModel.findOneAndUpdate(
        { id: req.params.id },
        { $set: updates },
        { new: true, upsert: true, lean: true }
      );
      const cleanUpdated = toPlainObject(updatedLead);
      const existingIndex = memoryLeads.findIndex(l => l.id === req.params.id);
      if (existingIndex >= 0) {
        memoryLeads[existingIndex] = cleanUpdated;
      } else {
        memoryLeads.unshift(cleanUpdated);
      }
      return res.json(cleanUpdated);
    }

    const existingIndex = memoryLeads.findIndex(l => l.id === req.params.id);
    if (existingIndex >= 0) {
      memoryLeads[existingIndex] = toPlainObject({ ...memoryLeads[existingIndex], ...updates });
    }
    return res.json(updates);
  } catch (error) {
    console.error('Error updating lead:', error.message);
    return res.status(500).json({ error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- ACTIVITIES & LOGS ENDPOINTS ---
// GET activities
app.get('/api/activities', async (req, res) => {
  try {
    const { leadId } = req.query;
    if (mongoose.connection.readyState === 1) {
      const filter = leadId ? { leadId } : {};
      const activities = await ActivityModel.find(filter).sort({ createdAt: -1 }).lean();
      const cleanActivities = activities.map(toPlainObject);
      if (!leadId) memoryActivities = cleanActivities;
      return res.json(cleanActivities);
    }

    const filtered = leadId ? memoryActivities.filter(a => a.leadId === leadId) : memoryActivities;
    return res.json(filtered.map(toPlainObject));
  } catch (error) {
    console.error('Error fetching activities:', error.message);
    const filtered = req.query.leadId ? memoryActivities.filter(a => a.leadId === req.query.leadId) : memoryActivities;
    return res.json(filtered.map(toPlainObject));
  }
});

// POST save activity
app.post('/api/activities', async (req, res) => {
  try {
    const actData = toPlainObject(req.body);
    if (!actData.id) {
      actData.id = 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    }
    if (!actData.createdAt) {
      actData.createdAt = new Date().toISOString();
    }

    if (mongoose.connection.readyState === 1) {
      const newActivity = await ActivityModel.findOneAndUpdate(
        { id: actData.id },
        { $set: actData },
        { new: true, upsert: true, lean: true }
      );
      const cleanActivity = toPlainObject(newActivity);
      memoryActivities.unshift(cleanActivity);
      return res.status(201).json(cleanActivity);
    }

    memoryActivities.unshift(actData);
    return res.status(201).json(actData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
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
      const dbSalespersons = await SalespersonModel.find().lean();
      const dbUsers = await UserModel.find().lean();
      const dbLeads = await LeadModel.find().lean();

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

    const result = cleanAndNormalizeSalespersons(Array.from(map.values()));
    memorySalespersons = result;
    return res.json(result);
  } catch (error) {
    console.error('Error fetching salespersons:', error.message);
    return res.json(cleanAndNormalizeSalespersons(memorySalespersons));
  }
});

// POST save / add salesperson
app.post('/api/salespersons', async (req, res) => {
  try {
    const spData = toPlainObject(req.body);
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
        { $set: spData },
        { new: true, upsert: true, lean: true }
      );
      return res.status(201).json(toPlainObject(saved));
    }

    return res.status(201).json(spData);
  } catch (error) {
    console.error('Error saving salesperson:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST bulk sync
app.post('/api/sync', async (req, res) => {
  try {
    const { leads = [], activities = [], salespersons = [] } = req.body;

    if (Array.isArray(leads) && leads.length > 0) {
      const cleanLeads = leads.map(toPlainObject);
      memoryLeads = cleanLeads;
      if (mongoose.connection.readyState === 1) {
        for (const lead of cleanLeads) {
          await LeadModel.findOneAndUpdate({ id: lead.id }, { $set: lead }, { upsert: true, lean: true });
        }
      }
    }

    if (Array.isArray(activities) && activities.length > 0) {
      const cleanActivities = activities.map(toPlainObject);
      memoryActivities = cleanActivities;
      if (mongoose.connection.readyState === 1) {
        for (const act of cleanActivities) {
          await ActivityModel.findOneAndUpdate({ id: act.id }, { $set: act }, { upsert: true, lean: true });
        }
      }
    }

    if (Array.isArray(salespersons) && salespersons.length > 0) {
      for (const sp of salespersons) {
        const cleanSp = toPlainObject(sp);
        const cleanEmail = (cleanSp.email || '').toLowerCase().trim();
        if (!cleanEmail) continue;
        cleanSp.email = cleanEmail;
        const idx = memorySalespersons.findIndex(s => s.email === cleanEmail);
        if (idx >= 0) {
          memorySalespersons[idx] = { ...memorySalespersons[idx], ...cleanSp };
        } else {
          memorySalespersons.push(cleanSp);
        }
        if (mongoose.connection.readyState === 1) {
          await SalespersonModel.findOneAndUpdate({ email: cleanEmail }, { $set: cleanSp }, { upsert: true, lean: true });
        }
      }
    }

    return res.json({ success: true, message: 'Synced successfully' });
  } catch (error) {
    console.error('Error syncing:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend CRM API Server connected and listening on port ${PORT}`);
  });
}

export default app;
