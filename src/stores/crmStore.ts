import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  Lead,
  Salesperson,
  ActivityHistoryItem,
  ColdCallLog,
  WhatsAppLog,
  RuleComplianceStatus,
  PipelineStage,
  LeadPriority,
  LeadSource,
  SmartQueueFilter
} from '../types/crm';
import { INITIAL_LEADS, INITIAL_SALESPERSONS, INITIAL_ACTIVITIES } from '../data/seedData';
import { isFollowUpDueToday, isFollowUpOverdue, isFollowUpUpcoming, formatDate } from '../utils/dateUtils';
import { apiService } from '../services/api';
import confetti from 'canvas-confetti';

export const useCRMStore = defineStore('crm', () => {
  // --- Persistent State ---
  const leads = ref<Lead[]>([]);
  const salespersons = ref<Salesperson[]>([]);
  const activities = ref<ActivityHistoryItem[]>([]);
  const isDbConnected = ref<boolean>(false);

  // Current active user / salesperson
  const currentSalesperson = ref<string>('Ali Raza');

  // UI state
  const currentView = ref<'table' | 'kanban' | 'queues' | 'analytics'>('table');
  const activeQueueFilter = ref<SmartQueueFilter>('all');
  const searchQuery = ref<string>('');
  const selectedStageFilter = ref<string>('all');
  const selectedPriorityFilter = ref<string>('all');
  const selectedSourceFilter = ref<string>('all');
  const selectedSalespersonFilter = ref<string>('all');

  // Modals & Drawers
  const isCreateLeadModalOpen = ref(false);
  const isQuickCallModalOpen = ref(false);
  const isQuickWhatsAppModalOpen = ref(false);
  const isImportExportModalOpen = ref(false);
  const isDetailDrawerOpen = ref(false);
  const activeLeadId = ref<string | null>(null);

  // Initialize from API / MongoDB or LocalStorage (Clean real database mode)
  async function initStore() {
    const savedLeads = localStorage.getItem('nexleads_crm_leads');
    const savedSalespersons = localStorage.getItem('nexleads_crm_salespersons');
    const savedActivities = localStorage.getItem('nexleads_crm_activities');

    if (savedLeads !== null) {
      try {
        leads.value = JSON.parse(savedLeads);
      } catch {
        leads.value = [];
      }
    } else {
      leads.value = [];
      saveLeads();
    }

    if (savedSalespersons !== null) {
      try {
        salespersons.value = JSON.parse(savedSalespersons);
      } catch {
        salespersons.value = INITIAL_SALESPERSONS;
      }
    } else {
      salespersons.value = INITIAL_SALESPERSONS;
      saveSalespersons();
    }

    if (savedActivities !== null) {
      try {
        activities.value = JSON.parse(savedActivities);
      } catch {
        activities.value = [];
      }
    } else {
      activities.value = [];
      saveActivities();
    }

    // Connect to MongoDB Atlas backend
    try {
      const health = await apiService.checkHealth();
      if (health.status === 'ok') {
        isDbConnected.value = true;
        const remoteLeads = await apiService.fetchLeads();
        if (remoteLeads && Array.isArray(remoteLeads)) {
          leads.value = remoteLeads;
          saveLeads();
        }

        const remoteActivities = await apiService.fetchActivities();
        if (remoteActivities && Array.isArray(remoteActivities)) {
          activities.value = remoteActivities;
          saveActivities();
        }
      }
    } catch {
      // Offline / LocalStorage mode
    }
  }

  function clearAllData() {
    leads.value = [];
    activities.value = [];
    saveLeads();
    saveActivities();
  }

  function loadSampleData() {
    leads.value = JSON.parse(JSON.stringify(INITIAL_LEADS));
    activities.value = JSON.parse(JSON.stringify(INITIAL_ACTIVITIES));
    salespersons.value = JSON.parse(JSON.stringify(INITIAL_SALESPERSONS));
    saveLeads();
    saveActivities();
    saveSalespersons();
    apiService.syncDatabase(leads.value, activities.value, salespersons.value).catch(() => {});
  }

  function saveLeads() {
    localStorage.setItem('nexleads_crm_leads', JSON.stringify(leads.value));
  }

  function saveSalespersons() {
    localStorage.setItem('nexleads_crm_salespersons', JSON.stringify(salespersons.value));
  }

  function saveActivities() {
    localStorage.setItem('nexleads_crm_activities', JSON.stringify(activities.value));
  }

  function resetToDemoData() {
    leads.value = JSON.parse(JSON.stringify(INITIAL_LEADS));
    salespersons.value = JSON.parse(JSON.stringify(INITIAL_SALESPERSONS));
    activities.value = JSON.parse(JSON.stringify(INITIAL_ACTIVITIES));
    saveLeads();
    saveSalespersons();
    saveActivities();
  }

  // --- Rule Compliance Engine ---
  // "No lead should remain without these five things: Assigned Person + Lead Status + Last Contact + Next Action + Follow-Up Date & Time"
  function checkLeadCompliance(lead: Lead): RuleComplianceStatus {
    const hasAssignedPerson = !!(lead.assignedSalesperson && lead.assignedSalesperson.trim().length > 0);
    const hasLeadStatus = !!(lead.stage && lead.stage.trim().length > 0);
    // If brand new and created today, last contact can be marked as 'Pending First Contact' or has value
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

  // Follow-Up Reminders computed lists
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
    return leads.value.filter(l => l.stage === 'New Lead' || !l.lastContactDate || l.totalCalls + l.totalWhatsApp === 0);
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

  const complianceRate = computed(() => {
    if (leads.value.length === 0) return 100;
    const compliantCount = leads.value.filter(l => checkLeadCompliance(l).isCompliant).length;
    return Math.round((compliantCount / leads.value.length) * 100);
  });

  // Filtered Leads
  const filteredLeads = computed(() => {
    return leads.value.filter(lead => {
      // Smart queue filter
      if (activeQueueFilter.value === 'due_today' && !queueFollowUpsDueToday.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'upcoming' && !queueUpcomingFollowUps.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'overdue' && !queueOverdueFollowUps.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'not_contacted' && !queueNotContacted.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'no_response' && !queueNoResponse.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'hot_leads' && !queueHotLeadsRequiringAction.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'proposals_pending' && !queueProposalsRequiringFollowUp.value.some(l => l.id === lead.id)) return false;
      if (activeQueueFilter.value === 'missing_rules' && checkLeadCompliance(lead).isCompliant) return false;

      // Dropdown filters
      if (selectedStageFilter.value !== 'all' && lead.stage !== selectedStageFilter.value) return false;
      if (selectedPriorityFilter.value !== 'all' && lead.priority !== selectedPriorityFilter.value) return false;
      if (selectedSourceFilter.value !== 'all' && lead.leadSource !== selectedSourceFilter.value) return false;
      if (selectedSalespersonFilter.value !== 'all' && lead.assignedSalesperson !== selectedSalespersonFilter.value) return false;

      // Search Query
      if (searchQuery.value.trim().length > 0) {
        const q = searchQuery.value.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesCompany = lead.companyName.toLowerCase().includes(q);
        const matchesPhone = lead.phoneNumber.toLowerCase().includes(q) || lead.whatsAppNumber.toLowerCase().includes(q);
        const matchesCity = lead.city.toLowerCase().includes(q);
        const matchesIndustry = lead.industry.toLowerCase().includes(q);
        const matchesService = lead.serviceRequired.toLowerCase().includes(q);
        const matchesNotes = lead.notes.toLowerCase().includes(q);
        if (!matchesName && !matchesCompany && !matchesPhone && !matchesCity && !matchesIndustry && !matchesService && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  });

  // --- CRUD Operations ---
  function addLead(newLeadData: Partial<Lead>): Lead {
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
      totalCalls: 0,
      totalWhatsApp: 0,
      tags: newLeadData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    leads.value.unshift(newLead);
    saveLeads();
    apiService.saveLead(newLead).catch(() => {});

    // Log Activity for lead addition
    addActivityItem({
      leadId: newLead.id,
      date: formatDate(today, 'dd MMM'),
      time: nowTime,
      channel: 'Website Enquiry',
      salesperson: currentSalesperson.value,
      attendedOrResponded: 'Scheduled',
      status: 'New Lead',
      notes: `Lead added from ${newLead.leadSource}. Assigned to ${newLead.assignedSalesperson}.`,
      nextFollowUp: `Follow up ${formatDate(newLead.nextFollowUpDate, 'dd MMM')}, ${newLead.nextFollowUpTime}`,
      type: 'note'
    });

    return newLead;
  }

  function updateLead(id: string, updates: Partial<Lead>) {
    const idx = leads.value.findIndex(l => l.id === id);
    if (idx === -1) return;

    const oldStage = leads.value[idx].stage;
    leads.value[idx] = {
      ...leads.value[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Confetti on Won!
    if (updates.stage && updates.stage === 'Won / Closed' && oldStage !== 'Won / Closed') {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    saveLeads();
    apiService.updateLead(id, updates).catch(() => {});
  }

  function updateLeadStage(id: string, newStage: PipelineStage) {
    const lead = leads.value.find(l => l.id === id);
    if (!lead) return;

    const oldStage = lead.stage;
    lead.stage = newStage;
    lead.updatedAt = new Date().toISOString();

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    addActivityItem({
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

    saveLeads();
    apiService.updateLead(id, { stage: newStage }).catch(() => {});
  }

  function deleteLead(id: string) {
    leads.value = leads.value.filter(l => l.id !== id);
    activities.value = activities.value.filter(a => a.leadId !== id);
    if (activeLeadId.value === id) {
      activeLeadId.value = null;
      isDetailDrawerOpen.value = false;
    }
    saveLeads();
    saveActivities();
    apiService.deleteLead(id).catch(() => {});
  }

  // --- Activities & Logging ---
  function addActivityItem(item: Omit<ActivityHistoryItem, 'id' | 'createdAt'>) {
    const newActivity: ActivityHistoryItem = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      ...item
    };
    activities.value.unshift(newActivity);
    saveActivities();
    apiService.saveActivity(newActivity).catch(() => {});
  }

  // Log Cold Call
  function logColdCall(callData: Omit<ColdCallLog, 'id' | 'createdAt'>) {
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

    // Auto stage adjustment if interested
    if (callData.outcomes.includes('Interested') && (lead.stage === 'New Lead' || lead.stage === 'Call Attempted')) {
      lead.stage = 'Interested';
      lead.priority = 'Hot';
    } else if (lead.stage === 'New Lead') {
      lead.stage = 'Call Attempted';
    }

    if (callData.outcomes.includes('Not Interested')) {
      lead.priority = 'Not Qualified';
    }

    saveLeads();

    // Create activity timeline entry (strictly formatted as per spec)
    const outcomesStr = callData.outcomes.join(', ');
    const dmStr = callData.decisionMakerAvailable ? ' [DM Available]' : '';
    const noteText = `${outcomesStr}${dmStr}. ${callData.callNotes}`;
    const nextFmt = callData.nextFollowUpDate
      ? `Follow up ${formatDate(callData.nextFollowUpDate, 'dd MMM')}, ${callData.nextFollowUpTime}`
      : 'No follow up set';

    addActivityItem({
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

  // Log WhatsApp
  function logWhatsApp(waData: Omit<WhatsAppLog, 'id' | 'createdAt'>) {
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

    // Stage progression
    if (waData.proposalSent) {
      lead.stage = 'Proposal Sent';
      lead.priority = 'Hot';
    } else if (lead.stage === 'New Lead' || lead.stage === 'Call Attempted') {
      lead.stage = 'WhatsApp Sent';
    }

    saveLeads();

    // Activity timeline entry
    let notesSummary = waData.conversationNotes;
    if (waData.documentsSent) notesSummary = `[Docs Sent] ${notesSummary}`;
    if (waData.proposalSent) notesSummary = `[Proposal Sent] ${notesSummary}`;

    const nextFmt = waData.nextFollowUpDate
      ? `Follow up ${formatDate(waData.nextFollowUpDate, 'dd MMM')}, ${waData.nextFollowUpTime}`
      : 'No follow up set';

    addActivityItem({
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

  // Open helper modals
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

  // CSV Import & Export
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
    link.setAttribute('download', `nexleads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function importLeadsFromCSV(parsedRows: any[]) {
    let importedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const row of parsedRows) {
      if (!row['Lead Name'] && !row['name'] && !row['Company Name'] && !row['companyName']) continue;

      addLead({
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

  return {
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

    // Modals
    isCreateLeadModalOpen,
    isQuickCallModalOpen,
    isQuickWhatsAppModalOpen,
    isImportExportModalOpen,
    isDetailDrawerOpen,
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
    complianceRate,
    filteredLeads,

    // Methods
    initStore,
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
    resetToDemoData,
    clearAllData,
    loadSampleData,
    exportLeadsToCSV,
    importLeadsFromCSV
  };
});
