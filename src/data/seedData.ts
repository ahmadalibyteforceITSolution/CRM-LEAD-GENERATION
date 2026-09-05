import { Lead, Salesperson, ActivityHistoryItem } from '../types/crm';

export const INITIAL_SALESPERSONS: Salesperson[] = [
  {
    id: 'sp-sales-op',
    name: 'Laiba Khan',
    email: 'salesspacesandplaces@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'Sales Operations Manager',
    activeLeadsCount: 0
  }
];

// Dummy seed data removed - only real manual data from MongoDB database is used
export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_ACTIVITIES: ActivityHistoryItem[] = [];
