import { Lead, ActivityHistoryItem, Salesperson, User } from '../types/crm';

const API_BASE = '/api';

export const apiService = {
  // Authentication
  async login(email: string, password: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: 'Network error connecting to auth server' };
    }
  },

  async register(userData: { name: string; email: string; password: string; role?: string; companyName?: string }): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: 'Network error connecting to auth server' };
    }
  },

  // Check backend health
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await res.json();
    } catch {
      return { status: 'offline', database: 'Disconnected' };
    }
  },

  // Leads
  async fetchLeads(): Promise<Lead[] | null> {
    try {
      const res = await fetch(`${API_BASE}/leads`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async saveLead(lead: Lead, userRole = 'SuperAdmin'): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(lead)
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async deleteLead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/leads/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Activities
  async fetchActivities(leadId?: string): Promise<ActivityHistoryItem[] | null> {
    try {
      const url = leadId ? `${API_BASE}/activities?leadId=${leadId}` : `${API_BASE}/activities`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async saveActivity(activity: ActivityHistoryItem): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity)
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Salespersons
  async fetchSalespersons(): Promise<Salesperson[] | null> {
    try {
      const res = await fetch(`${API_BASE}/salespersons`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async saveSalesperson(salesperson: Salesperson): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/salespersons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salesperson)
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Bulk Sync with MongoDB Atlas
  async syncDatabase(leads: Lead[], activities: ActivityHistoryItem[], salespersons: Salesperson[]): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, activities, salespersons })
      });
      return res.ok;
    } catch {
      return false;
    }
  }
};
