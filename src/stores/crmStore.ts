import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import {
  Lead,
  Salesperson,
  User,
  ActivityHistoryItem,
  ColdCallLog,
  WhatsAppLog,
  RuleComplianceStatus,
  PipelineStage,
  LeadPriority,
  LeadSource,
  SmartQueueFilter
} from '../types/crm';
import { INITIAL_SALESPERSONS, INITIAL_LEADS, INITIAL_ACTIVITIES } from '../data/seedData';
import { isFollowUpDueToday, isFollowUpOverdue, isFollowUpUpcoming, formatDate } from '../utils/dateUtils';
import { apiService } from '../services/api';
import confetti from 'canvas-confetti';

export const useCRMStore = defineStore('crm', () => {
  // --- Pure MongoDB Atlas Database State (with resilient caching) ---
  const getInitialSalespersons = (): Salesperson[] => {
    try {
      const cached = localStorage.getItem('nexleads_salespersons');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_SALESPERSONS;
  };

  const leads = ref<Lead[]>([]);
  const salespersons = ref<Salesperson[]>(getInitialSalespersons());
  const activities = ref<ActivityHistoryItem[]>([]);
  const isDbConnected = ref<boolean>(true);
  const isLoading = ref<boolean>(false);

  // Helper to ensure a user is in salespersons list and synced
  function ensureSalespersonInList(user: { id?: string; name: string; email?: string; role?: string; avatar?: string }) {
    if (!user || !user.name) return;
    const cleanName = user.name.trim();
    const cleanEmail = (user.email || '').toLowerCase().trim();
    const existingIndex = salespersons.value.findIndex(
      s => s.name.toLowerCase() === cleanName.toLowerCase() || (cleanEmail && s.email.toLowerCase() === cleanEmail)
    );

    const isLaiba = cleanName.toLowerCase() === 'laiba shahid';
    const isSuperAdmin = cleanName.toLowerCase() === 'superadmin';

    if (existingIndex < 0) {
      salespersons.value.push({
        id: user.id || ('sp-' + encodeURIComponent(cleanName.toLowerCase().replace(/\s+/g, '-'))),
        name: cleanName,
        email: cleanEmail || (isLaiba ? 'salesspacesandplaces@gmail.com' : (isSuperAdmin ? 'admin@nexleads.io' : `${cleanName.toLowerCase().replace(/\s+/g, '.')}@nexleads.io`)),
        role: user.role || (isLaiba ? 'Sales Operations Manager' : (isSuperAdmin ? 'SuperAdmin' : 'Sales Representative')),
        avatar: user.avatar || (isSuperAdmin ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`),
        activeLeadsCount: 0
      });
    } else {
      if (user.role && salespersons.value[existingIndex].role !== user.role) {
        salespersons.value[existingIndex].role = user.role;
      }
      if (cleanEmail && !salespersons.value[existingIndex].email) {
        salespersons.value[existingIndex].email = cleanEmail;
      }
    }
    try {
      localStorage.setItem('nexleads_salespersons', JSON.stringify(salespersons.value));
    } catch (e) {}
  }

  // Current active user & Authentication
  const currentUser = ref<User | null>(null);
  const isAuthenticated = computed(() => !!currentUser.value);
  const authError = ref<string>('');
  const isAuthLoading = ref<boolean>(false);

  // Current active salesperson name
  const currentSalesperson = ref<string>('Ali Raza');

  // UI state
  const currentView = ref<'table' | 'kanban' | 'queues' | 'analytics'>('table');
  const activeQueueFilter = ref<SmartQueueFilter>('all');
  const searchQuery = ref<string>('');
  const selectedStageFilter = ref<string>('all');
  const selectedPriorityFilter = ref<string>('all');
  const selectedSourceFilter = ref<string>('all');
  const selectedSalespersonFilter = ref<string>('all');
  const startDateFilter = ref<string>('');
  const endDateFilter = ref<string>('');

  // Reset activeQueueFilter to 'all' when a user selects a specific dropdown filter to prevent empty results
  watch(selectedPriorityFilter, (newVal) => {
    if (newVal !== 'all' && activeQueueFilter.value !== 'all') {
      activeQueueFilter.value = 'all';
    }
  });
  watch(selectedStageFilter, (newVal) => {
    if (newVal !== 'all' && activeQueueFilter.value !== 'all') {
      activeQueueFilter.value = 'all';
    }
  });
  watch(selectedSourceFilter, (newVal) => {
    if (newVal !== 'all' && activeQueueFilter.value !== 'all') {
      activeQueueFilter.value = 'all';
    }
  });
  watch(startDateFilter, (newVal) => {
    if (newVal && activeQueueFilter.value !== 'all') {
      activeQueueFilter.value = 'all';
    }
  });
  watch(endDateFilter, (newVal) => {
    if (newVal && activeQueueFilter.value !== 'all') {
      activeQueueFilter.value = 'all';
    }
  });

  // Modals & Drawers
  const isCreateLeadModalOpen = ref(false);
  const isQuickCallModalOpen = ref(false);
  const isQuickWhatsAppModalOpen = ref(false);
  const isImportExportModalOpen = ref(false);
  const isDetailDrawerOpen = ref(false);
  const isMobileSidebarOpen = ref(false);
  const activeLeadId = ref<string | null>(null);

  // --- Auth Actions ---
  async function loginUser(email: string, pass: string): Promise<boolean> {
    isAuthLoading.value = true;
    authError.value = '';
    try {
      const res = await apiService.login(email, pass);
      if (res.success && res.user) {
        currentUser.value = res.user;
        currentSalesperson.value = res.user.name;
        ensureSalespersonInList(res.user);
        localStorage.setItem('nexleads_auth_user', JSON.stringify(res.user));
        confetti({ particleCount: 50, spread: 60 });
        return true;
      } else {
        authError.value = res.error || 'Invalid credentials';
        return false;
      }
    } catch (err: any) {
      authError.value = 'Failed to connect to authentication server';
      return false;
    } finally {
      isAuthLoading.value = false;
    }
  }

  async function registerUser(data: { name: string; email: string; password: string; role?: string; companyName?: string }): Promise<boolean> {
    isAuthLoading.value = true;
    authError.value = '';
    try {
      const res = await apiService.register(data);
      if (res.success && res.user) {
        currentUser.value = res.user;
        currentSalesperson.value = res.user.name;
        ensureSalespersonInList(res.user);
        localStorage.setItem('nexleads_auth_user', JSON.stringify(res.user));
        confetti({ particleCount: 70, spread: 80 });
        return true;
      } else {
        authError.value = res.error || 'Registration failed';
        return false;
      }
    } catch (err: any) {
      authError.value = 'Registration error';
      return false;
    } finally {
      isAuthLoading.value = false;
    }
  }

  function loginDemoUser(demoEmail: string = 'ali.raza@nexleads.io') {
    const sp = salespersons.value.find(s => s.email === demoEmail) || salespersons.value[0];
    const demoUser: User = {
      id: sp.id,
      name: sp.name,
      email: sp.email,
      role: sp.role,
      companyName: 'NexLeads Agency',
      avatar: sp.avatar
    };
    currentUser.value = demoUser;
    currentSalesperson.value = demoUser.name;
    ensureSalespersonInList(demoUser);
    localStorage.setItem('nexleads_auth_user', JSON.stringify(demoUser));
    confetti({ particleCount: 40, spread: 50 });
  }

  function logoutUser() {
    currentUser.value = null;
    localStorage.removeItem('nexleads_auth_user');
  }

  // --- Fetch Directly from MongoDB Database ---
  async function fetchAllFromDB() {
    isLoading.value = true;
    try {
      const [dbLeads, dbActivities, dbSalespersons] = await Promise.all([
        apiService.fetchLeads(),
        apiService.fetchActivities(),
        apiService.fetchSalespersons()
      ]);

      if (dbLeads && Array.isArray(dbLeads)) {
        leads.value = dbLeads;
      }
      if (dbActivities && Array.isArray(dbActivities)) {
        activities.value = dbActivities;
      }

      const map = new Map<string, Salesperson>();

      // 1. Initial standard personas
      for (const sp of INITIAL_SALESPERSONS) {
        map.set(sp.name.toLowerCase(), sp);
      }

      // 2. Local in-memory list
      for (const sp of salespersons.value) {
        map.set(sp.name.toLowerCase(), sp);
      }

      // 3. Backend DB salespersons
      if (dbSalespersons && Array.isArray(dbSalespersons)) {
        for (const sp of dbSalespersons) {
          map.set(sp.name.toLowerCase(), sp);
        }
      }

      // 4. Extract assigned reps from all existing leads
      for (const lead of leads.value) {
        const rep = (lead.assignedSalesperson || '').trim();
        if (rep && rep.toLowerCase() !== 'unassigned') {
          const key = rep.toLowerCase();
          if (!map.has(key)) {
            const isLaiba = key === 'laiba shahid';
            const isSuperAdmin = key === 'superadmin';
            map.set(key, {
              id: 'sp-' + encodeURIComponent(key.replace(/\s+/g, '-')),
              name: rep,
              email: isLaiba ? 'salesspacesandplaces@gmail.com' : (isSuperAdmin ? 'admin@nexleads.io' : `${key.replace(/\s+/g, '.')}@nexleads.io`),
              role: isLaiba ? 'Sales Operations Manager' : (isSuperAdmin ? 'SuperAdmin' : 'Sales Representative'),
              avatar: isSuperAdmin ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rep)}`,
              activeLeadsCount: 0
            });
          }
        }
      }

      salespersons.value = Array.from(map.values());

      if (currentUser.value) {
        ensureSalespersonInList(currentUser.value);
      }
      try {
        localStorage.setItem('nexleads_salespersons', JSON.stringify(salespersons.value));
      } catch (e) {}
      isDbConnected.value = true;
    } catch (error) {
      console.error('Failed to fetch from MongoDB database:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function initStore() {
    // Restore cached salespersons if available
    try {
      const cachedSalespersons = localStorage.getItem('nexleads_salespersons');
      if (cachedSalespersons) {
        const parsed = JSON.parse(cachedSalespersons);
        if (Array.isArray(parsed) && parsed.length > 0) {
          salespersons.value = parsed;
        }
      }
    } catch (e) {}

    // Check for existing session
    const savedUser = localStorage.getItem('nexleads_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        currentUser.value = parsed;
        currentSalesperson.value = parsed.name || 'Ali Raza';
        ensureSalespersonInList(parsed);
      } catch (e) {
        localStorage.removeItem('nexleads_auth_user');
      }
    }

    await fetchAllFromDB();
  }

  // --- Rule Compliance Engine ---
  function checkLeadCompliance(lead: Lead): RuleComplianceStatus {
    const hasAssignedPerson = !!(lead.assignedSalesperson && lead.assignedSalesperson.trim().length > 0);
    const hasLeadStatus = !!(lead.stage && lead.stage.trim().length > 0);
    const hasLastContact = !!(lead.lastContactDate && lead.lastContactDate.trim().length > 0);
    const hasNextAction = !!(lead.nextAction && lead.nextAction.trim().length > 0);
    const hasNextFollowUp = !!(lead.nextFollowUpDate && lead.nextFollowUpDate.trim().length > 0);

    const missingFields: string[] = [];
    if (!hasAssignedPerson) missingFields.push('Assigned Person');
    if (!hasLeadStatus) missingFields.push('Lead Status');
    if (!hasLastContact) missingFields.push('Last Contact');
    if (!hasNextAction) missingFields.push('Next Action');
    if (!hasNextFollowUp) missingFields.push('Follow-Up Date & Time');

    return {
      isCompliant: missingFields.length === 0,
      hasAssignedPerson,
      hasLeadStatus,
      hasLastContact,
      hasNextAction,
      hasNextFollowUp,
      missingCount: missingFields.length,
      missingFields
    };
  }

  // --- Computed Stats & Smart Queues ---
  const activeLead = computed(() => {
    if (!activeLeadId.value) return null;
    return leads.value.find(l => l.id === activeLeadId.value) || null;
  });

  const activeLeadActivities = computed(() => {
    if (!activeLeadId.value) return [];
    return activities.value
      .filter(a => a.leadId === activeLeadId.value)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  const queueFollowUpsDueToday = computed(() => {
    return leads.value.filter(l => l.stage !== 'Won / Closed' && l.stage !== 'Lost' && isFollowUpDueToday(l.nextFollowUpDate));
  });

  const queueUpcomingFollowUps = computed(() => {
    return leads.value.filter(l => l.stage !== 'Won / Closed' && l.stage !== 'Lost' && isFollowUpUpcoming(l.nextFollowUpDate));
  });

  const queueOverdueFollowUps = computed(() => {
    return leads.value.filter(l => l.stage !== 'Won / Closed' && l.stage !== 'Lost' && isFollowUpOverdue(l.nextFollowUpDate, l.nextFollowUpTime));
  });

  const queueNotContacted = computed(() => {
    return leads.value.filter(l => l.priority === 'Not Qualified' || l.stage === 'New Lead' || !l.lastContactDate || (l.totalCalls || 0) + (l.totalWhatsApp || 0) === 0);
  });

  const queueNoResponse = computed(() => {
    return leads.value.filter(l => l.stage === 'Call Attempted' || (l.tags && l.tags.includes('No Response')));
  });

  const queueHotLeadsRequiringAction = computed(() => {
    return leads.value.filter(l => l.priority === 'Hot' && l.stage !== 'Won / Closed' && l.stage !== 'Lost');
  });

  const queueProposalsRequiringFollowUp = computed(() => {
    return leads.value.filter(l => l.stage === 'Proposal Sent' || l.stage === 'Negotiation');
  });

  const nonCompliantLeads = computed(() => {
    return leads.value.filter(l => !checkLeadCompliance(l).isCompliant);
  });

  const queueNotQualified = computed(() => {
    return queueNotContacted.value;
  });

  const complianceRate = computed(() => {
    if (leads.value.length === 0) return 100;
    const compliantCount = leads.value.filter(l => checkLeadCompliance(l).isCompliant).length;
    return Math.round((compliantCount / leads.value.length) * 100);
  });

  // Filtered Leads
  const filteredLeads = computed(() => {
    return leads.value.filter(lead => {
      // Respect role-based access: Only SuperAdmin and Admin can see all leads
      if (currentUser.value && currentUser.value.role !== 'SuperAdmin' && currentUser.value.role !== 'Admin') {
        if (lead.assignedSalesperson !== currentUser.value.name) return false;
      }

      if (activeQueueFilter.value === 'due_today' && !queueFollowUpsDueToday.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'upcoming' && !queueUpcomingFollowUps.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'overdue' && !queueOverdueFollowUps.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'not_contacted' && !queueNotContacted.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'no_response' && !queueNoResponse.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'hot_leads' && !queueHotLeadsRequiringAction.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'proposals_pending' && !queueProposalsRequiringFollowUp.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'missing_rules' && !queueNotQualified.value.some(l => l.id === lead.id)) return false;

      if (selectedStageFilter.value !== 'all' && lead.stage !== selectedStageFilter.value) return false;
      if (selectedPriorityFilter.value !== 'all' && lead.priority !== selectedPriorityFilter.value) return false;
      if (selectedSourceFilter.value !== 'all' && lead.leadSource !== selectedSourceFilter.value) return false;
      if (selectedSalespersonFilter.value !== 'all' && lead.assignedSalesperson !== selectedSalespersonFilter.value) return false;

      // Date range filtering
      if (startDateFilter.value) {
        const leadDate = lead.dateLeadAdded ? lead.dateLeadAdded.substring(0, 10) : (lead.createdAt ? lead.createdAt.substring(0, 10) : '');
        if (leadDate && leadDate < startDateFilter.value) return false;
      }
      if (endDateFilter.value) {
        const leadDate = lead.dateLeadAdded ? lead.dateLeadAdded.substring(0, 10) : (lead.createdAt ? lead.createdAt.substring(0, 10) : '');
        if (leadDate && leadDate > endDateFilter.value) return false;
      }

      if (searchQuery.value.trim().length > 0) {
        const q = searchQuery.value.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesCompany = (lead.companyName || '').toLowerCase().includes(q);
        const matchesPhone = (lead.phoneNumber || '').toLowerCase().includes(q) || (lead.whatsAppNumber || '').toLowerCase().includes(q);
        const matchesCity = (lead.city || '').toLowerCase().includes(q);
        const matchesIndustry = (lead.industry || '').toLowerCase().includes(q);
        const matchesService = (lead.serviceRequired || '').toLowerCase().includes(q);
        const matchesNotes = (lead.notes || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCompany && !matchesPhone && !matchesCity && !matchesIndustry && !matchesService && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  });

  // --- Direct MongoDB CRUD Operations ---
  async function addLead(newLeadData: Partial<Lead>): Promise<Lead> {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    const newLead: Lead = {
      id: 'lead-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: newLeadData.name || 'Unnamed Lead',
      companyName: newLeadData.companyName || '',
      phoneNumber: newLeadData.phoneNumber || '',
      whatsAppNumber: newLeadData.whatsAppNumber || newLeadData.phoneNumber || '',
      email: newLeadData.email || '',
      industry: newLeadData.industry || 'General Business',
      city: newLeadData.city || '',
      fullAddress: newLeadData.fullAddress || '',
      serviceRequired: newLeadData.serviceRequired || 'Lead Generation',
      leadSource: (newLeadData.leadSource as LeadSource) || 'Google Maps',
      dateLeadAdded: newLeadData.dateLeadAdded || today,
      notes: newLeadData.notes || '',
      dealValue: newLeadData.dealValue || 0,
      projectType: newLeadData.projectType || 'Other',
      areaSize: newLeadData.areaSize || '',
      budgetRange: newLeadData.budgetRange || '',
      timeline: newLeadData.timeline || '',
      projectLocation: newLeadData.projectLocation || '',
      stage: newLeadData.stage || 'New Lead',
      priority: newLeadData.priority || 'Cold',
      assignedSalesperson: newLeadData.assignedSalesperson || currentSalesperson.value,
      assignedDate: today,
      assignedTime: nowTime,
      assignedBy: currentSalesperson.value,
      territory: newLeadData.territory || 'General',
      currentOwner: newLeadData.assignedSalesperson || currentSalesperson.value,
      lastContactedBy: newLeadData.lastContactedBy || '',
      lastContactDate: newLeadData.lastContactDate || '',
      lastContactTime: newLeadData.lastContactTime || '',
      nextFollowUpOwner: newLeadData.nextFollowUpOwner || newLeadData.assignedSalesperson || currentSalesperson.value,
      nextAction: newLeadData.nextAction || 'First Cold Outreach',
      nextFollowUpDate: newLeadData.nextFollowUpDate || today,
      nextFollowUpTime: newLeadData.nextFollowUpTime || '14:00',
      preferredChannel: newLeadData.preferredChannel || 'Cold Call',
      notQualifiedReason: newLeadData.notQualifiedReason || '',
      totalCalls: 0,
      totalWhatsApp: 0,
      tags: newLeadData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optimistic UI update
    leads.value.unshift(newLead);

    // Save directly to MongoDB Database
    await apiService.saveLead(newLead);

    // Log Activity directly to MongoDB Database
    await addActivityItem({
      leadId: newLead.id,
      date: formatDate(today, 'dd MMM'),
      time: nowTime,
      channel: 'Website Enquiry',
      salesperson: currentSalesperson.value,
      attendedOrResponded: 'Scheduled',
      status: 'New Lead',
      notes: `Lead created from ${newLead.leadSource}. Assigned to ${newLead.assignedSalesperson}.`,
      nextFollowUp: `Follow up ${formatDate(newLead.nextFollowUpDate, 'dd MMM')}, ${newLead.nextFollowUpTime}`,
      type: 'note'
    });

    return newLead;
  }

  async function updateLead(id: string, updates: Partial<Lead>) {
    const idx = leads.value.findIndex(l => l.id === id);
    if (idx === -1) return;

    const oldStage = leads.value[idx].stage;
    leads.value[idx] = {
      ...leads.value[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updates.stage && updates.stage === 'Won / Closed' && oldStage !== 'Won / Closed') {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // Save directly to MongoDB Database
    await apiService.updateLead(id, updates);
  }

  async function updateLeadStage(id: string, newStage: PipelineStage) {
    const lead = leads.value.find(l => l.id === id);
    if (!lead) return;

    const oldStage = lead.stage;
    lead.stage = newStage;
    lead.updatedAt = new Date().toISOString();

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    await apiService.updateLead(id, { stage: newStage });

    await addActivityItem({
      leadId: id,
      date: formatDate(today, 'dd MMM'),
      time: nowTime,
      channel: lead.preferredChannel || 'Cold Call',
      salesperson: currentSalesperson.value,
      attendedOrResponded: 'Attended',
      status: newStage,
      notes: `Pipeline stage moved from "${oldStage}" to "${newStage}".`,
      nextFollowUp: lead.nextFollowUpDate ? `${formatDate(lead.nextFollowUpDate, 'dd MMM')}, ${lead.nextFollowUpTime}` : 'Pending schedule',
      type: 'stage_change'
    });

    if (newStage === 'Won / Closed') {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  }

  async function deleteLead(id: string) {
    leads.value = leads.value.filter(l => l.id !== id);
    activities.value = activities.value.filter(a => a.leadId !== id);
    if (activeLeadId.value === id) {
      activeLeadId.value = null;
      isDetailDrawerOpen.value = false;
    }
    // Delete directly from MongoDB Database
    await apiService.deleteLead(id);
  }

  // --- Activities & Logging directly to MongoDB ---
  async function addActivityItem(item: Omit<ActivityHistoryItem, 'id' | 'createdAt'>) {
    const newActivity: ActivityHistoryItem = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      ...item
    };
    activities.value.unshift(newActivity);
    await apiService.saveActivity(newActivity);
  }

  // Log Cold Call directly to MongoDB
  async function logColdCall(callData: Omit<ColdCallLog, 'id' | 'createdAt'>) {
    const lead = leads.value.find(l => l.id === callData.leadId);
    if (!lead) return;

    lead.totalCalls = (lead.totalCalls || 0) + 1;
    lead.lastContactedBy = callData.calledBy;
    lead.lastContactDate = callData.callDate;
    lead.lastContactTime = callData.callTime;
    lead.nextAction = callData.nextAction;
    lead.nextFollowUpDate = callData.nextFollowUpDate;
    lead.nextFollowUpTime = callData.nextFollowUpTime;
    lead.updatedAt = new Date().toISOString();

    if (callData.outcomes.includes('Interested') && (lead.stage === 'New Lead' || lead.stage === 'Call Attempted')) {
      lead.stage = 'Interested';
      lead.priority = 'Hot';
    } else if (lead.stage === 'New Lead') {
      lead.stage = 'Call Attempted';
    }

    if (callData.outcomes.includes('Not Interested')) {
      lead.priority = 'Not Qualified';
    }

    await apiService.updateLead(lead.id, {
      totalCalls: lead.totalCalls,
      lastContactedBy: lead.lastContactedBy,
      lastContactDate: lead.lastContactDate,
      lastContactTime: lead.lastContactTime,
      nextAction: lead.nextAction,
      nextFollowUpDate: lead.nextFollowUpDate,
      nextFollowUpTime: lead.nextFollowUpTime,
      stage: lead.stage,
      priority: lead.priority
    });

    const outcomesStr = callData.outcomes.join(', ');
    const dmStr = callData.decisionMakerAvailable ? ' [DM Available]' : '';
    const noteText = `${outcomesStr}${dmStr}. ${callData.callNotes}`;
    const nextFmt = callData.nextFollowUpDate
      ? `Follow up ${formatDate(callData.nextFollowUpDate, 'dd MMM')}, ${callData.nextFollowUpTime}`
      : 'No follow up set';

    await addActivityItem({
      leadId: callData.leadId,
      date: formatDate(callData.callDate, 'dd MMM'),
      time: callData.callTime,
      channel: 'Cold Call',
      salesperson: callData.calledBy,
      attendedOrResponded: callData.callAnswered ? 'Answered' : 'No Response',
      status: lead.stage,
      notes: noteText,
      nextFollowUp: nextFmt,
      type: 'call'
    });
  }

  // Log WhatsApp directly to MongoDB
  async function logWhatsApp(waData: Omit<WhatsAppLog, 'id' | 'createdAt'>) {
    const lead = leads.value.find(l => l.id === waData.leadId);
    if (!lead) return;

    lead.totalWhatsApp = (lead.totalWhatsApp || 0) + 1;
    lead.lastContactedBy = currentSalesperson.value;
    lead.lastContactDate = waData.messageSentDate;
    lead.lastContactTime = waData.messageSentTime;
    if (waData.nextFollowUpDate) {
      lead.nextFollowUpDate = waData.nextFollowUpDate;
      lead.nextFollowUpTime = waData.nextFollowUpTime;
    }
    lead.updatedAt = new Date().toISOString();

    if (waData.proposalSent) {
      lead.stage = 'Proposal Sent';
      lead.priority = 'Hot';
    } else if (lead.stage === 'New Lead' || lead.stage === 'Call Attempted') {
      lead.stage = 'WhatsApp Sent';
    }

    await apiService.updateLead(lead.id, {
      totalWhatsApp: lead.totalWhatsApp,
      lastContactedBy: lead.lastContactedBy,
      lastContactDate: lead.lastContactDate,
      lastContactTime: lead.lastContactTime,
      nextFollowUpDate: lead.nextFollowUpDate,
      nextFollowUpTime: lead.nextFollowUpTime,
      stage: lead.stage,
      priority: lead.priority
    });

    let notesSummary = waData.conversationNotes;
    if (waData.documentsSent) notesSummary = `[Docs Sent] ${notesSummary}`;
    if (waData.proposalSent) notesSummary = `[Proposal Sent] ${notesSummary}`;

    const nextFmt = waData.nextFollowUpDate
      ? `Follow up ${formatDate(waData.nextFollowUpDate, 'dd MMM')}, ${waData.nextFollowUpTime}`
      : 'No follow up set';

    await addActivityItem({
      leadId: waData.leadId,
      date: formatDate(waData.messageSentDate, 'dd MMM'),
      time: waData.messageSentTime,
      channel: waData.whatsAppCallMade ? 'WhatsApp Call' : 'WhatsApp Chat',
      salesperson: currentSalesperson.value,
      attendedOrResponded: waData.customerReplied ? 'Replied' : (waData.messageRead ? 'Attended' : 'No Response'),
      status: lead.stage,
      notes: notesSummary,
      nextFollowUp: nextFmt,
      type: 'whatsapp'
    });
  }

  function openLeadDetail(leadId: string) {
    activeLeadId.value = leadId;
    isDetailDrawerOpen.value = true;
  }

  function openQuickCall(leadId: string) {
    activeLeadId.value = leadId;
    isQuickCallModalOpen.value = true;
  }

  function openQuickWhatsApp(leadId: string) {
    activeLeadId.value = leadId;
    isQuickWhatsAppModalOpen.value = true;
  }

  // CSV Export & Import directly with MongoDB
  function exportLeadsToCSV() {
    const headers = [
      'Lead Name',
      'Company Name',
      'Phone Number',
      'WhatsApp Number',
      'Email',
      'Industry',
      'City',
      'Service Required',
      'Lead Source',
      'Date Added',
      'Stage',
      'Priority',
      'Assigned Salesperson',
      'Last Contact Date',
      'Next Action',
      'Next Follow-Up Date',
      'Next Follow-Up Time',
      'Total Calls',
      'Total WhatsApp',
      'Notes'
    ];

    const rows = leads.value.map(l => [
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.companyName || '').replace(/"/g, '""')}"`,
      `"${(l.phoneNumber || '').replace(/"/g, '""')}"`,
      `"${(l.whatsAppNumber || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.industry || '').replace(/"/g, '""')}"`,
      `"${(l.city || '').replace(/"/g, '""')}"`,
      `"${(l.serviceRequired || '').replace(/"/g, '""')}"`,
      `"${(l.leadSource || '').replace(/"/g, '""')}"`,
      `"${l.dateLeadAdded || ''}"`,
      `"${l.stage || ''}"`,
      `"${l.priority || ''}"`,
      `"${l.assignedSalesperson || ''}"`,
      `"${l.lastContactDate || ''}"`,
      `"${(l.nextAction || '').replace(/"/g, '""')}"`,
      `"${l.nextFollowUpDate || ''}"`,
      `"${l.nextFollowUpTime || ''}"`,
      l.totalCalls || 0,
      l.totalWhatsApp || 0,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `nexleads_crm_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function importLeadsFromCSV(parsedRows: any[]) {
    let importedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const row of parsedRows) {
      if (!row['Lead Name'] && !row['name'] && !row['Company Name'] && !row['companyName']) continue;

      await addLead({
        name: row['Lead Name'] || row['name'] || 'New Lead',
        companyName: row['Company Name'] || row['company'] || '',
        phoneNumber: row['Phone Number'] || row['phone'] || '',
        whatsAppNumber: row['WhatsApp Number'] || row['whatsapp'] || row['phone'] || '',
        email: row['Email'] || row['email'] || '',
        industry: row['Industry'] || row['industry'] || 'General',
        city: row['City'] || row['city'] || '',
        serviceRequired: row['Service Required'] || row['service'] || 'Lead Generation',
        leadSource: (row['Lead Source'] || row['source'] || 'Google Maps') as LeadSource,
        notes: row['Notes'] || row['notes'] || 'Imported via CSV',
        priority: (row['Priority'] || 'Cold') as LeadPriority,
        stage: (row['Stage'] || 'New Lead') as PipelineStage,
        assignedSalesperson: row['Assigned Salesperson'] || currentSalesperson.value,
        nextAction: row['Next Action'] || 'Cold Call / WhatsApp Outreach',
        nextFollowUpDate: row['Next Follow-Up Date'] || today,
        nextFollowUpTime: row['Next Follow-Up Time'] || '14:00'
      });
      importedCount++;
    }
    return importedCount;
  }

  async function resetToDemoData() {
    leads.value = [...INITIAL_LEADS];
    activities.value = [...INITIAL_ACTIVITIES];
    salespersons.value = [...INITIAL_SALESPERSONS];
    await apiService.syncDatabase(leads.value, activities.value, salespersons.value);
  }

  return {
    resetToDemoData,
    // Auth State & Actions
    currentUser,
    isAuthenticated,
    authError,
    isAuthLoading,
    loginUser,
    registerUser,
    loginDemoUser,
    logoutUser,

    // State
    leads,
    salespersons,
    activities,
    currentSalesperson,
    currentView,
    activeQueueFilter,
    searchQuery,
    selectedStageFilter,
    selectedPriorityFilter,
    selectedSourceFilter,
    selectedSalespersonFilter,
    startDateFilter,
    endDateFilter,
    isDbConnected,
    isLoading,

    // Modals
    isCreateLeadModalOpen,
    isQuickCallModalOpen,
    isQuickWhatsAppModalOpen,
    isImportExportModalOpen,
    isDetailDrawerOpen,
    isMobileSidebarOpen,
    activeLeadId,

    // Computed
    activeLead,
    activeLeadActivities,
    queueFollowUpsDueToday,
    queueUpcomingFollowUps,
    queueOverdueFollowUps,
    queueNotContacted,
    queueNoResponse,
    queueHotLeadsRequiringAction,
    queueProposalsRequiringFollowUp,
    nonCompliantLeads,
    queueNotQualified,
    complianceRate,
    filteredLeads,

    // Methods
    initStore,
    fetchAllFromDB,
    checkLeadCompliance,
    addLead,
    updateLead,
    updateLeadStage,
    deleteLead,
    logColdCall,
    logWhatsApp,
    addActivityItem,
    openLeadDetail,
    openQuickCall,
    openQuickWhatsApp,
    exportLeadsToCSV,
    importLeadsFromCSV
  };
});
