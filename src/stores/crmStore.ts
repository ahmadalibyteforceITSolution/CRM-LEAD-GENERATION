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
import { INITIAL_SALESPERSONS } from '../data/seedData';
import { isFollowUpDueToday, isFollowUpOverdue, isFollowUpUpcoming, formatDate } from '../utils/dateUtils';
import { apiService } from '../services/api';
import confetti from 'canvas-confetti';

export const useCRMStore = defineStore('crm', () => {
  // --- Pure MongoDB Atlas Database State (NO localStorage) ---
  function cleanAndDeduplicateSalespersons(list: Salesperson[]): Salesperson[] {
    const map = new Map<string, Salesperson>();
    const blockedDemoNames = ['ali raza', 'sarah jenkins', 'michael chang', 'priya sharma', 'sara khan', 'hamza malik', 'zainab abbas', 'superadmin'];
    for (const item of list) {
      if (!item || !item.name) continue;
      let name = item.name.trim();
      let email = (item.email || '').toLowerCase().trim();
      let role = item.role || 'Sales Representative';
      let avatar = item.avatar || '';

      // Ignore removed demo accounts and SuperAdmin (SuperAdmin is admin, not assignable salesperson)
      if (blockedDemoNames.includes(name.toLowerCase()) || role === 'SuperAdmin') continue;

      // Normalize any variation of Laiba to single exact 'Laiba Khan'
      if (name.toLowerCase().includes('laiba') || email === 'salesspacesandplaces@gmail.com' || email === 'salesspaceandplaces@gmail.com') {
        name = 'Laiba Khan';
        email = 'salesspacesandplaces@gmail.com';
        role = 'Sales Operations Manager';
        avatar = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80';
      }

      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          ...item,
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

  function sanitizeLead(l: any): Lead {
    if (!l) return l;
    let base: any = l;
    if (l._doc) {
      base = { ...l._doc, ...l };
    } else {
      base = { ...l };
    }
    delete base.$__;
    delete base._doc;
    delete base.paths;
    delete base.$locals;
    delete base.$op;
    delete base.isNew;

    // Ensure reliable string ID
    if (!base.id && base._id) {
      base.id = typeof base._id === 'string' ? base._id : base._id.toString();
    }

    // Normalize salesperson name - NEVER assign SuperAdmin to leads!
    let rep = (base.assignedSalesperson || '').trim();
    if (!rep || rep.toLowerCase() === 'superadmin' || rep.toLowerCase().includes('laiba') || rep.toLowerCase() === 'unassigned') {
      rep = 'Laiba Khan';
    }
    base.assignedSalesperson = rep;
    if (!base.currentOwner || base.currentOwner.toLowerCase() === 'superadmin' || base.currentOwner.toLowerCase().includes('laiba')) {
      base.currentOwner = rep;
    }
    if (!base.nextFollowUpOwner || base.nextFollowUpOwner.toLowerCase() === 'superadmin' || base.nextFollowUpOwner.toLowerCase().includes('laiba')) {
      base.nextFollowUpOwner = rep;
    }

    return base as Lead;
  }

  const leads = ref<Lead[]>([]);
  const salespersons = ref<Salesperson[]>(cleanAndDeduplicateSalespersons(INITIAL_SALESPERSONS));
  const activities = ref<ActivityHistoryItem[]>([]);
  const isDbConnected = ref<boolean>(true);
  const isLoading = ref<boolean>(false);

  // Helper to ensure a user is in salespersons list and synced
  function ensureSalespersonInList(user: { id?: string; name: string; email?: string; role?: string; avatar?: string }) {
    if (!user || !user.name) return;
    let cleanName = user.name.trim();
    let cleanEmail = (user.email || '').toLowerCase().trim();

    const blockedDemoNames = ['ali raza', 'sarah jenkins', 'michael chang', 'priya sharma', 'sara khan', 'hamza malik', 'zainab abbas', 'superadmin'];
    if (blockedDemoNames.includes(cleanName.toLowerCase()) || user.role === 'SuperAdmin') return;

    if (cleanName.toLowerCase().includes('laiba') || cleanEmail === 'salesspacesandplaces@gmail.com' || cleanEmail === 'salesspaceandplaces@gmail.com') {
      cleanName = 'Laiba Khan';
      cleanEmail = 'salesspacesandplaces@gmail.com';
    }

    const isLaiba = cleanName.toLowerCase() === 'laiba khan';

    const existingIndex = salespersons.value.findIndex(
      s => s.name.toLowerCase() === cleanName.toLowerCase() || (cleanEmail && s.email.toLowerCase() === cleanEmail)
    );

    if (existingIndex < 0) {
      salespersons.value.push({
        id: user.id || ('sp-' + encodeURIComponent(cleanName.toLowerCase().replace(/\s+/g, '-'))),
        name: cleanName,
        email: cleanEmail || `${cleanName.toLowerCase().replace(/\s+/g, '.')}@nexleads.io`,
        role: user.role || (isLaiba ? 'Sales Operations Manager' : 'Sales Representative'),
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        activeLeadsCount: 0
      });
    } else {
      if (user.role && salespersons.value[existingIndex].role !== user.role) {
        salespersons.value[existingIndex].role = user.role;
      }
      if (cleanEmail && !salespersons.value[existingIndex].email) {
        salespersons.value[existingIndex].email = cleanEmail;
      }
      salespersons.value[existingIndex].name = cleanName;
    }

    salespersons.value = cleanAndDeduplicateSalespersons(salespersons.value);
  }

  // Current active user & Authentication
  const currentUser = ref<User | null>(null);
  const isAuthenticated = computed(() => !!currentUser.value);
  const authError = ref<string>('');
  const isAuthLoading = ref<boolean>(false);

  // Current active salesperson name (sales reps like Laiba Khan)
  const currentSalesperson = ref<string>('Laiba Khan');

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
  const isEditLeadModalOpen = ref(false);
  const editingLeadId = ref<string | null>(null);
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
        try {
          sessionStorage.setItem('nexleads_auth_user', JSON.stringify(res.user));
        } catch (e) {}
        await fetchAllFromDB();
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
        try {
          sessionStorage.setItem('nexleads_auth_user', JSON.stringify(res.user));
        } catch (e) {}
        await fetchAllFromDB();
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

  async function loginDemoUser(demoEmail: string = 'salesspacesandplaces@gmail.com') {
    const sp = salespersons.value.find(s => s.email === demoEmail) || salespersons.value[0];
    const demoUser: User = {
      id: sp.id,
      name: sp.name,
      email: sp.email,
      role: sp.role,
      companyName: sp.name === 'SuperAdmin' ? 'NexLeads Agency' : 'Spaces & Places',
      avatar: sp.avatar
    };
    currentUser.value = demoUser;
    currentSalesperson.value = demoUser.name;
    ensureSalespersonInList(demoUser);
    try {
      sessionStorage.setItem('nexleads_auth_user', JSON.stringify(demoUser));
    } catch (e) {}
    await fetchAllFromDB();
    confetti({ particleCount: 40, spread: 50 });
  }

  function logoutUser() {
    currentUser.value = null;
    currentSalesperson.value = '';
    leads.value = [];
    activities.value = [];
    activeLeadId.value = null;
    isDetailDrawerOpen.value = false;
    try {
      sessionStorage.removeItem('nexleads_auth_user');
      localStorage.clear();
    } catch (e) {}
  }

  // --- Fetch Directly from MongoDB Database (NO localStorage) ---
  async function fetchAllFromDB() {
    // DO NOT FETCH FROM API IF USER IS LOGGED OUT / UNAUTHENTICATED
    if (!currentUser.value) {
      leads.value = [];
      activities.value = [];
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    try {
      const [dbLeads, dbActivities, dbSalespersons] = await Promise.all([
        apiService.fetchLeads(),
        apiService.fetchActivities(),
        apiService.fetchSalespersons()
      ]);

      if (dbLeads && Array.isArray(dbLeads)) {
        leads.value = dbLeads.map(sanitizeLead);
      }
      if (dbActivities && Array.isArray(dbActivities)) {
        activities.value = dbActivities.map((a: any) => {
          const clean = a._doc ? { ...a._doc, ...a } : { ...a };
          delete clean.$__;
          delete clean._doc;
          delete clean.paths;
          return clean;
        });
      }

      // Normalize any lead assigned to old demo reps so they belong to Laiba Khan
      const blockedDemoNames = ['ali raza', 'sarah jenkins', 'michael chang', 'priya sharma', 'sara khan', 'hamza malik', 'zainab abbas', 'superadmin'];
      for (const lead of leads.value) {
        if (lead.assignedSalesperson) {
          const repLower = lead.assignedSalesperson.toLowerCase().trim();
          if (repLower.includes('laiba') || repLower === 'superadmin' || blockedDemoNames.includes(repLower)) {
            lead.assignedSalesperson = 'Laiba Khan';
            lead.currentOwner = 'Laiba Khan';
            lead.nextFollowUpOwner = 'Laiba Khan';
          }
        } else {
          lead.assignedSalesperson = 'Laiba Khan';
          lead.currentOwner = 'Laiba Khan';
          lead.nextFollowUpOwner = 'Laiba Khan';
        }
      }

      const map = new Map<string, Salesperson>();

      // 1. Initial standard personas (Laiba Khan)
      for (const sp of INITIAL_SALESPERSONS) {
        if (sp.role !== 'SuperAdmin' && !blockedDemoNames.includes(sp.name.toLowerCase())) {
          map.set(sp.name.toLowerCase(), sp);
        }
      }

      // 2. Local in-memory list
      for (const sp of salespersons.value) {
        if (!blockedDemoNames.includes(sp.name.toLowerCase()) && sp.role !== 'SuperAdmin') {
          map.set(sp.name.toLowerCase(), sp);
        }
      }

      // 3. Backend DB salespersons
      if (dbSalespersons && Array.isArray(dbSalespersons)) {
        for (const sp of dbSalespersons) {
          if (!blockedDemoNames.includes(sp.name.toLowerCase()) && sp.role !== 'SuperAdmin') {
            map.set(sp.name.toLowerCase(), sp);
          }
        }
      }

      // 4. Extract assigned reps from all existing leads
      for (const lead of leads.value) {
        let rep = (lead.assignedSalesperson || '').trim();
        if (rep && rep.toLowerCase() !== 'unassigned' && rep.toLowerCase() !== 'superadmin') {
          if (rep.toLowerCase().includes('laiba') || blockedDemoNames.includes(rep.toLowerCase())) {
            rep = 'Laiba Khan';
          }
          const key = rep.toLowerCase();
          if (!map.has(key)) {
            const isLaiba = key === 'laiba khan' || key.includes('laiba');
            map.set(key, {
              id: 'sp-' + encodeURIComponent(key.replace(/\s+/g, '-')),
              name: isLaiba ? 'Laiba Khan' : rep,
              email: isLaiba ? 'salesspacesandplaces@gmail.com' : `${key.replace(/\s+/g, '.')}@nexleads.io`,
              role: isLaiba ? 'Sales Operations Manager' : 'Sales Representative',
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rep)}`,
              activeLeadsCount: 0
            });
          }
        }
      }

      salespersons.value = cleanAndDeduplicateSalespersons(Array.from(map.values()));

      if (currentUser.value) {
        ensureSalespersonInList(currentUser.value);
      }
      isDbConnected.value = true;
    } catch (error) {
      console.error('Failed to fetch from MongoDB database:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function initStore() {
    // Purge any old localStorage so NO data is stored in localStorage
    try {
      localStorage.clear();
    } catch (e) {}

    // Check for existing session in sessionStorage (active tab session only)
    try {
      const savedUser = sessionStorage.getItem('nexleads_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.name && (parsed.name.toLowerCase().includes('laiba') || parsed.email === 'salesspacesandplaces@gmail.com' || parsed.email === 'salesspaceandplaces@gmail.com')) {
          parsed.name = 'Laiba Khan';
          parsed.email = 'salesspacesandplaces@gmail.com';
          parsed.role = 'Sales Operations Manager';
          sessionStorage.setItem('nexleads_auth_user', JSON.stringify(parsed));
        }
        currentUser.value = parsed;
        currentSalesperson.value = parsed.role === 'SuperAdmin' ? 'Laiba Khan' : (parsed.name || 'Laiba Khan');
        ensureSalespersonInList(parsed);
      }
    } catch (e) {
      sessionStorage.removeItem('nexleads_auth_user');
    }

    // ONLY fetch from DB if an authenticated user session is active!
    if (currentUser.value) {
      await fetchAllFromDB();
    }
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
    return leads.value.find(l => l.id === activeLeadId.value || (l as any)._id === activeLeadId.value) || null;
  });

  const editingLead = computed(() => {
    if (!editingLeadId.value) return null;
    return leads.value.find(l => l.id === editingLeadId.value || (l as any)._id === editingLeadId.value) || null;
  });

  const activeLeadActivities = computed(() => {
    if (!activeLeadId.value) return [];
    const current = activeLead.value;
    const targetId = current?.id || activeLeadId.value;
    const mongoId = (current as any)?._id;
    return activities.value
      .filter(a => a.leadId === targetId || (mongoId && a.leadId === mongoId))
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
      // Respect role-based access: SuperAdmin, Admin, and Sales Operations Manager can see all leads
      if (currentUser.value && currentUser.value.role !== 'SuperAdmin' && currentUser.value.role !== 'Admin' && currentUser.value.role !== 'Sales Operations Manager') {
        const leadRep = (lead.assignedSalesperson || '').trim().toLowerCase();
        const userRep = (currentUser.value.name || '').trim().toLowerCase();
        if (leadRep !== userRep) return false;
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
      if (selectedSalespersonFilter.value !== 'all') {
        const leadRep = (lead.assignedSalesperson || '').trim().toLowerCase();
        const filterRep = selectedSalespersonFilter.value.trim().toLowerCase();
        if (leadRep !== filterRep) return false;
      }

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
        const q = searchQuery.value.toLowerCase().trim();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesCompany = (lead.companyName || '').toLowerCase().includes(q);
        const matchesPhone = (lead.phoneNumber || '').toLowerCase().includes(q) || (lead.whatsAppNumber || '').toLowerCase().includes(q);
        const matchesEmail = (lead.email || '').toLowerCase().includes(q);
        const matchesCity = (lead.city || '').toLowerCase().includes(q);
        const matchesIndustry = (lead.industry || '').toLowerCase().includes(q);
        const matchesService = (lead.serviceRequired || '').toLowerCase().includes(q);
        const matchesNotes = (lead.notes || '').toLowerCase().includes(q);
        const matchesRep = (lead.assignedSalesperson || '').toLowerCase().includes(q);
        const matchesStage = (lead.stage || '').toLowerCase().includes(q);
        const matchesPriority = (lead.priority || '').toLowerCase().includes(q);
        const matchesSource = (lead.leadSource || '').toLowerCase().includes(q);
        const matchesTerritory = (lead.territory || '').toLowerCase().includes(q);
        const matchesProjectType = (lead.projectType || '').toLowerCase().includes(q);

        if (!matchesName && !matchesCompany && !matchesPhone && !matchesEmail && !matchesCity && !matchesIndustry && !matchesService && !matchesNotes && !matchesRep && !matchesStage && !matchesPriority && !matchesSource && !matchesTerritory && !matchesProjectType) {
          return false;
        }
      }

      return true;
    });
  });

  // --- Direct MongoDB CRUD Operations ---
  async function addLead(newLeadData: Partial<Lead>): Promise<Lead> {
    // STRICT ROLE PERMISSION: Only SuperAdmin can add leads!
    if (currentUser.value && currentUser.value.role !== 'SuperAdmin') {
      throw new Error('Permission denied: Only SuperAdmin is authorized to add leads.');
    }

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    // NEVER assign to SuperAdmin! Leads belong to sales representatives like Laiba Khan
    let assignedRep = (newLeadData.assignedSalesperson || currentSalesperson.value || '').trim();
    if (!assignedRep || assignedRep.toLowerCase() === 'superadmin' || assignedRep.toLowerCase() === 'unassigned') {
      assignedRep = 'Laiba Khan';
    } else if (assignedRep.toLowerCase().includes('laiba')) {
      assignedRep = 'Laiba Khan';
    }

    const creator = 'SuperAdmin';

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
      assignedSalesperson: assignedRep,
      assignedDate: newLeadData.assignedDate || today,
      assignedTime: newLeadData.assignedTime || nowTime,
      assignedBy: newLeadData.assignedBy || creator,
      territory: newLeadData.territory || 'General',
      currentOwner: newLeadData.currentOwner || assignedRep,
      lastContactedBy: newLeadData.lastContactedBy || '',
      lastContactDate: newLeadData.lastContactDate || '',
      lastContactTime: newLeadData.lastContactTime || '',
      nextFollowUpOwner: newLeadData.nextFollowUpOwner || assignedRep,
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
    await apiService.saveLead(newLead, currentUser.value?.role || 'SuperAdmin');

    // Log Activity directly to MongoDB Database
    const initialActivityNotes = newLead.notes && newLead.notes.trim()
      ? `Lead created from ${newLead.leadSource}. Note: "${newLead.notes}". Assigned to ${newLead.assignedSalesperson}.`
      : `Lead created from ${newLead.leadSource}. Assigned to ${newLead.assignedSalesperson}.`;

    await addActivityItem({
      leadId: newLead.id,
      date: formatDate(today, 'dd MMM'),
      time: nowTime,
      channel: 'Website Enquiry',
      salesperson: assignedRep,
      attendedOrResponded: 'Scheduled',
      status: 'New Lead',
      notes: initialActivityNotes,
      nextFollowUp: `Follow up ${formatDate(newLead.nextFollowUpDate, 'dd MMM')}, ${newLead.nextFollowUpTime}`,
      type: 'note'
    });

    return newLead;
  }

  async function updateLead(id: string, updates: Partial<Lead>) {
    if (!id) return;
    const idx = leads.value.findIndex(l => l.id === id || (l as any)._id === id);
    if (idx === -1) return;

    const actualId = leads.value[idx].id || id;
    const oldStage = leads.value[idx].stage;
    const finalUpdates = { ...updates };
    if (finalUpdates.assignedSalesperson) {
      if (!finalUpdates.currentOwner) finalUpdates.currentOwner = finalUpdates.assignedSalesperson;
      if (!finalUpdates.nextFollowUpOwner) finalUpdates.nextFollowUpOwner = finalUpdates.assignedSalesperson;
    }

    leads.value[idx] = {
      ...leads.value[idx],
      ...finalUpdates,
      updatedAt: new Date().toISOString()
    };

    if (finalUpdates.stage && finalUpdates.stage === 'Won / Closed' && oldStage !== 'Won / Closed') {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // Save directly to MongoDB Database
    await apiService.updateLead(actualId, finalUpdates);
  }

  async function updateLeadStage(id: string, newStage: PipelineStage) {
    if (!id) return;
    const lead = leads.value.find(l => l.id === id || (l as any)._id === id);
    if (!lead) return;

    const actualId = lead.id || id;
    const oldStage = lead.stage;
    lead.stage = newStage;
    lead.updatedAt = new Date().toISOString();

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    await apiService.updateLead(actualId, { stage: newStage });

    await addActivityItem({
      leadId: actualId,
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

  async function deleteLead(id: string): Promise<boolean> {
    if (!id) return false;
    const targetLead = leads.value.find(l => l.id === id || (l as any)._id === id);
    const targetId = targetLead?.id || id;
    const mongoId = (targetLead as any)?._id;

    leads.value = leads.value.filter(l => l.id !== targetId && (l as any)._id !== targetId && (!mongoId || (l as any)._id !== mongoId));
    activities.value = activities.value.filter(a => a.leadId !== targetId && (!mongoId || a.leadId !== mongoId));
    if (activeLeadId.value === targetId || (mongoId && activeLeadId.value === mongoId)) {
      activeLeadId.value = null;
      isDetailDrawerOpen.value = false;
    }
    // Delete directly from MongoDB Database
    return await apiService.deleteLead(targetId);
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
    const lead = leads.value.find(l => l.id === callData.leadId || (l as any)._id === callData.leadId);
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

    const actualLeadId = lead.id || (lead as any)._id;
    await apiService.updateLead(actualLeadId, {
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
      leadId: actualLeadId,
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
    const lead = leads.value.find(l => l.id === waData.leadId || (l as any)._id === waData.leadId);
    if (!lead) return;

    const actualLeadId = lead.id || (lead as any)._id;
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

    await apiService.updateLead(actualLeadId, {
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
    const lead = leads.value.find(l => l.id === leadId || (l as any)._id === leadId);
    activeLeadId.value = lead?.id || leadId;
    isDetailDrawerOpen.value = true;
  }

  function openQuickCall(leadId: string) {
    const lead = leads.value.find(l => l.id === leadId || (l as any)._id === leadId);
    activeLeadId.value = lead?.id || leadId;
    isQuickCallModalOpen.value = true;
  }

  function openQuickWhatsApp(leadId: string) {
    const lead = leads.value.find(l => l.id === leadId || (l as any)._id === leadId);
    activeLeadId.value = lead?.id || leadId;
    isQuickWhatsAppModalOpen.value = true;
  }

  function openEditLead(leadId: string) {
    const lead = leads.value.find(l => l.id === leadId || (l as any)._id === leadId);
    editingLeadId.value = lead?.id || leadId;
    isEditLeadModalOpen.value = true;
  }

  // CSV Export & Import directly with MongoDB
  function exportLeadsToCSV() {
    const headers = [
      'Lead ID',
      'Lead Name',
      'Company Name',
      'Phone Number',
      'WhatsApp Number',
      'Email',
      'City',
      'Full Address',
      'Industry',
      'Service Required',
      'Lead Source',
      'Date Added',
      'Pipeline Stage',
      'Priority',
      'Deal Value',
      'Budget Range',
      'Project Type',
      'Project Location',
      'Area Size',
      'Timeline',
      'Not Qualified Reason',
      'Assigned Salesperson',
      'Assigned Date',
      'Assigned Time',
      'Assigned By',
      'Territory',
      'Current Owner',
      'Last Contacted By',
      'Last Contact Date',
      'Last Contact Time',
      'Next Action',
      'Next Follow-Up Date',
      'Next Follow-Up Time',
      'Next Follow-Up Owner',
      'Preferred Channel',
      'Total Calls',
      'Total WhatsApp',
      'Tags',
      'Lead Notes / Requirements',
      'All Call & Interaction History Notes',
      'Created At',
      'Updated At'
    ];

    const rows = leads.value.map(l => {
      // Find all activities logged for this lead
      const leadActivities = activities.value.filter(a => a.leadId === l.id);
      const activityNotesSummary = leadActivities
        .map(a => `[${a.date} ${a.time || ''} | ${a.salesperson || ''} | ${a.channel || ''} (${a.attendedOrResponded || ''})]: ${a.notes || ''}`)
        .join(' \n');

      return [
        `"${(l.id || '').replace(/"/g, '""')}"`,
        `"${(l.name || '').replace(/"/g, '""')}"`,
        `"${(l.companyName || '').replace(/"/g, '""')}"`,
        `"${(l.phoneNumber || '').replace(/"/g, '""')}"`,
        `"${(l.whatsAppNumber || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.city || '').replace(/"/g, '""')}"`,
        `"${(l.fullAddress || '').replace(/"/g, '""')}"`,
        `"${(l.industry || '').replace(/"/g, '""')}"`,
        `"${(l.serviceRequired || '').replace(/"/g, '""')}"`,
        `"${(l.leadSource || '').replace(/"/g, '""')}"`,
        `"${l.dateLeadAdded || ''}"`,
        `"${l.stage || ''}"`,
        `"${l.priority || ''}"`,
        l.dealValue || 0,
        `"${(l.budgetRange || '').replace(/"/g, '""')}"`,
        `"${(l.projectType || '').replace(/"/g, '""')}"`,
        `"${(l.projectLocation || '').replace(/"/g, '""')}"`,
        `"${(l.areaSize || '').replace(/"/g, '""')}"`,
        `"${(l.timeline || '').replace(/"/g, '""')}"`,
        `"${(l.notQualifiedReason || '').replace(/"/g, '""')}"`,
        `"${l.assignedSalesperson || ''}"`,
        `"${l.assignedDate || ''}"`,
        `"${l.assignedTime || ''}"`,
        `"${l.assignedBy || ''}"`,
        `"${(l.territory || '').replace(/"/g, '""')}"`,
        `"${l.currentOwner || ''}"`,
        `"${l.lastContactedBy || ''}"`,
        `"${l.lastContactDate || ''}"`,
        `"${l.lastContactTime || ''}"`,
        `"${(l.nextAction || '').replace(/"/g, '""')}"`,
        `"${l.nextFollowUpDate || ''}"`,
        `"${l.nextFollowUpTime || ''}"`,
        `"${l.nextFollowUpOwner || ''}"`,
        `"${l.preferredChannel || ''}"`,
        l.totalCalls || 0,
        l.totalWhatsApp || 0,
        `"${(Array.isArray(l.tags) ? l.tags.join(', ') : '').replace(/"/g, '""')}"`,
        `"${(l.notes || '').replace(/"/g, '""')}"`,
        `"${activityNotesSummary.replace(/"/g, '""')}"`,
        `"${l.createdAt || ''}"`,
        `"${l.updatedAt || ''}"`
      ];
    });

    // Add UTF-8 BOM (\uFEFF) for Excel & Google Sheets compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `spaces_and_places_crm_leads_${new Date().toISOString().split('T')[0]}.csv`);
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
        fullAddress: row['Full Address'] || row['address'] || '',
        serviceRequired: row['Service Required'] || row['service'] || 'Lead Generation',
        leadSource: (row['Lead Source'] || row['source'] || 'Google Maps') as LeadSource,
        notes: row['Lead Notes / Requirements'] || row['Notes'] || row['notes'] || 'Imported via CSV',
        priority: (row['Priority'] || 'Cold') as LeadPriority,
        stage: (row['Pipeline Stage'] || row['Stage'] || 'New Lead') as PipelineStage,
        projectType: row['Project Type'] || 'Other',
        projectLocation: row['Project Location'] || '',
        budgetRange: row['Budget Range'] || '',
        areaSize: row['Area Size'] || '',
        timeline: row['Timeline'] || '',
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
    await fetchAllFromDB();
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
    isEditLeadModalOpen,
    editingLeadId,
    isQuickCallModalOpen,
    isQuickWhatsAppModalOpen,
    isImportExportModalOpen,
    isDetailDrawerOpen,
    isMobileSidebarOpen,
    activeLeadId,

    // Computed
    activeLead,
    editingLead,
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
    openEditLead,
    exportLeadsToCSV,
    importLeadsFromCSV
  };
});
