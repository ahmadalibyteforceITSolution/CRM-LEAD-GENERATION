<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { PipelineStage, LeadPriority, LeadSource, ContactChannel } from '@/types/crm';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import StageBadge from '@/components/common/StageBadge.vue';
import RuleHealthBadge from '@/components/common/RuleHealthBadge.vue';
import { formatDate, formatDateTime, isFollowUpOverdue, isFollowUpDueToday, getTodayString, getCurrentTimeString } from '@/utils/dateUtils';
import {
  X,
  PhoneCall,
  MessageCircle,
  Mail,
  Building,
  MapPin,
  Calendar,
  Clock,
  UserCheck,
  Tag,
  FileText,
  DollarSign,
  Send,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  History,
  CheckCircle2,
  AlertCircle,
  Pencil
} from 'lucide-vue-next';

const store = useCRMStore();
const lead = computed(() => store.activeLead);
const activities = computed(() => store.activeLeadActivities);
const compliance = computed(() => lead.value ? store.checkLeadCompliance(lead.value) : null);
const assignableSalespersons = computed(() => {
  return store.salespersons.filter(sp => sp.role !== 'SuperAdmin' && sp.name.toLowerCase() !== 'superadmin');
});

// Quick Add Note / Custom Activity state
const newActivityType = ref<'note' | 'call' | 'whatsapp' | 'meeting' | 'not_qualified'>('note');
const newActivityNotes = ref('');
const newActivityFollowUpDate = ref(getTodayString());
const newActivityFollowUpTime = ref('15:00');

const allStages: PipelineStage[] = [
  'New Lead',
  'Call Attempted',
  'Contacted',
  'WhatsApp Sent',
  'Interested',
  'Follow-Up Required',
  'Meeting Scheduled',
  'Proposal Sent',
  'Negotiation',
  'Won / Closed',
  'Lost'
];

const allSources: LeadSource[] = [
  'Google Maps',
  'Google Search / SERP',
  'LinkedIn',
  'Website',
  'Google Ads',
  'Meta Ads',
  'Referral',
  'Existing Database',
  'Other'
];

function handleQuickLogActivity() {
  if (!lead.value || !newActivityNotes.value.trim()) return;

  const today = getTodayString();
  const nowTime = getCurrentTimeString();
  const nextFmt = newActivityFollowUpDate.value
    ? `Follow up ${formatDate(newActivityFollowUpDate.value, 'dd MMM')}, ${newActivityFollowUpTime.value}`
    : 'None';

  let channel: ContactChannel = 'Cold Call';
  let attended: 'Answered' | 'Replied' | 'Attended' | 'Scheduled' | 'Rejected' = 'Answered';

  if (newActivityType.value === 'whatsapp') {
    channel = 'WhatsApp Chat';
    attended = 'Replied';
  } else if (newActivityType.value === 'meeting') {
    channel = 'Meeting';
    attended = 'Scheduled';
  } else if (newActivityType.value === 'note') {
    channel = 'Website Enquiry';
    attended = 'Attended';
  } else if (newActivityType.value === 'not_qualified') {
    channel = 'Cold Call';
    attended = 'Rejected';
  }

  const leadId = lead.value?.id || (lead.value as any)?._id;
  if (!leadId) return;

  store.addActivityItem({
    leadId,
    date: formatDate(today, 'dd MMM'),
    time: nowTime,
    channel,
    salesperson: store.currentSalesperson,
    attendedOrResponded: attended,
    status: lead.value.stage,
    notes: newActivityType.value === 'not_qualified' ? 'Not Qualified Reason: ' + newActivityNotes.value.trim() : newActivityNotes.value.trim(),
    nextFollowUp: nextFmt,
    type: newActivityType.value
  });

  // Update lead follow-up
  const leadUpdates: any = {
    lastContactedBy: store.currentSalesperson,
    lastContactDate: today,
    lastContactTime: nowTime,
    nextAction: newActivityType.value === 'not_qualified' ? 'Lead marked as Not Qualified' : newActivityNotes.value.slice(0, 50)
  };

  if (newActivityFollowUpDate.value) {
    leadUpdates.nextFollowUpDate = newActivityFollowUpDate.value;
    leadUpdates.nextFollowUpTime = newActivityFollowUpTime.value;
  }

  if (newActivityType.value === 'not_qualified') {
    leadUpdates.priority = 'Not Qualified';
    leadUpdates.notQualifiedReason = newActivityNotes.value.trim();
  }

  store.updateLead(leadId, leadUpdates);

  newActivityNotes.value = '';
}

function handleFieldChange(field: string, value: any) {
  if (lead.value) {
    const leadId = lead.value.id || (lead.value as any)._id;
    if (!leadId) return;

    if (field === 'assignedSalesperson') {
      store.updateLead(leadId, {
        assignedSalesperson: value,
        currentOwner: value,
        nextFollowUpOwner: value
      });
      return;
    }
    store.updateLead(leadId, { [field]: value });
  }
}

// In-App Delete Confirmation Modal (No Browser Alert)
const isDeleteConfirmOpen = ref(false);
const isDeleting = ref(false);

async function handleDeleteLeadFromDrawer() {
  if (!lead.value) return;
  const leadId = lead.value.id || (lead.value as any)._id;
  if (!leadId) return;

  isDeleting.value = true;
  try {
    await store.deleteLead(leadId);
    isDeleting.value = false;
    isDeleteConfirmOpen.value = false;
    closeDrawer();
  } catch {
    isDeleting.value = false;
    isDeleteConfirmOpen.value = false;
  }
}

const budgetOptions = ['0.5-1m', '1m-2m', '2m-3m', '3m-4m range'];
const areaOptions = ['700-1000sq.feet', '1000-2000 sq.ft', '2000-3000 sq.ft', 'above 3000 sq.ft'];
const timelineOptions = ['Immediately', '0-1 month', '1-2 month'];

const budgetIndex = computed({
  get: () => {
    const val = lead.value?.budgetRange || '1m-2m';
    const idx = budgetOptions.indexOf(val);
    return idx !== -1 ? idx : 1;
  },
  set: (idx: number) => {
    const leadId = lead.value?.id || (lead.value as any)?._id;
    if (leadId) {
      const budgetVal = budgetOptions[idx];
      store.updateLead(leadId, { budgetRange: budgetVal, dealValue: getNumericDealValue(budgetVal) });
    }
  }
});

const areaIndex = computed({
  get: () => {
    const val = lead.value?.areaSize || '';
    const idx = areaOptions.indexOf(val);
    return idx !== -1 ? idx : 1;
  },
  set: (idx: number) => {
    const leadId = lead.value?.id || (lead.value as any)?._id;
    if (leadId) {
      store.updateLead(leadId, { areaSize: areaOptions[idx] });
    }
  }
});

const timelineIndex = computed({
  get: () => {
    const val = lead.value?.timeline || '';
    const idx = timelineOptions.indexOf(val);
    return idx !== -1 ? idx : 0;
  },
  set: (idx: number) => {
    const leadId = lead.value?.id || (lead.value as any)?._id;
    if (leadId) {
      store.updateLead(leadId, { timeline: timelineOptions[idx] });
    }
  }
});

function getNumericDealValue(budget: string): number {
  if (budget === '0.5-1m') return 750000;
  if (budget === '1m-2m') return 1500000;
  if (budget === '2m-3m') return 2500000;
  if (budget === '3m-4m range') return 3500000;
  return 0;
}

function closeDrawer() {
  store.isDetailDrawerOpen = false;
}
</script>

<template>
  <div
    v-if="store.isDetailDrawerOpen && lead"
    class="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
  >
    <div class="w-full sm:max-w-2xl lg:max-w-4xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
      <!-- Drawer Top Bar -->
      <div class="p-3.5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-base sm:text-lg flex items-center justify-center shadow-md flex-shrink-0">
            {{ (lead?.name || '?').charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">{{ lead.name }}</h2>
              <PriorityBadge :priority="lead.priority" size="sm" />
              <StageBadge :stage="lead.stage" size="sm" />
            </div>
            <div class="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
              <span class="font-semibold text-slate-700 dark:text-slate-300 truncate">{{ lead.companyName }}</span>
              <span>•</span>
              <span class="flex items-center gap-1 truncate"><MapPin class="w-3 h-3 text-slate-400 flex-shrink-0" /> {{ lead.city || 'No city' }}</span>
              <span>•</span>
              <span class="font-mono text-emerald-600 font-bold">Rs. {{ (lead.dealValue || 0).toLocaleString() }}</span>
            </div>
            <!-- Project metadata header badges -->
            <div v-if="lead.projectType || lead.areaSize || lead.budgetRange || lead.projectLocation" class="text-[10px] sm:text-[11px] flex items-center gap-1.5 mt-2 flex-wrap font-bold">
              <span v-if="lead.projectType" class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-200/30">{{ lead.projectType }}</span>
              <span v-if="lead.areaSize" class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200/50">{{ lead.areaSize }}</span>
              <span v-if="lead.budgetRange" class="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200/30">{{ lead.budgetRange }}</span>
              <span v-if="lead.projectLocation" class="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200/30 flex items-center gap-1"><MapPin class="w-3 h-3 flex-shrink-0" />{{ lead.projectLocation }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <!-- Edit Profile Action -->
          <button
            @click="store.openEditLead(lead.id)"
            class="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
            title="Edit All Lead Profile Details"
          >
            <Pencil class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Edit Profile</span>
            <span class="sm:hidden">Edit</span>
          </button>

          <!-- Cold Call Action -->
          <button
            @click="store.openQuickCall(lead.id)"
            class="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
          >
            <PhoneCall class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Call Lead</span>
            <span class="sm:hidden">Call</span>
          </button>

          <!-- WhatsApp Action -->
          <button
            @click="store.openQuickWhatsApp(lead.id)"
            class="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <MessageCircle class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">WhatsApp</span>
            <span class="sm:hidden">WA</span>
          </button>

          <!-- Delete Lead Action -->
          <button
            @click="isDeleteConfirmOpen = true"
            class="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete Lead"
          >
            <Trash2 class="w-4 h-4" />
          </button>

          <!-- Close -->
          <button
            @click="closeDrawer"
            class="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Drawer Body: Grid layout (Left: Info & Ownership, Right: Timeline & Notes) -->
      <div class="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 text-xs">
        <!-- LEFT COLUMN: Lead Information & Ownership (5 Cols) -->
        <div class="lg:col-span-5 p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto">
          <!-- 5-Rule Health Card -->
          <div class="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-200/70 dark:border-indigo-800/70 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <ShieldCheck class="w-4 h-4 text-indigo-600" />
                <span>5 Golden Rules Status</span>
              </span>
              <RuleHealthBadge :lead="lead" />
            </div>

            <div class="space-y-1 text-[11px] pt-1">
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>1. Assigned Person:</span>
                <span :class="compliance?.hasAssignedPerson ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'">
                  {{ lead.assignedSalesperson || 'Missing' }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>2. Lead Status:</span>
                <span :class="compliance?.hasLeadStatus ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'">
                  {{ lead.stage }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>3. Last Contact:</span>
                <span :class="compliance?.hasLastContact ? 'text-emerald-600 font-bold' : 'text-amber-500 font-bold'">
                  {{ lead.lastContactDate ? formatDate(lead.lastContactDate, 'dd MMM') + ' ' + lead.lastContactTime : 'Pending Contact' }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>4. Next Action:</span>
                <span :class="compliance?.hasNextAction ? 'text-emerald-600 font-bold truncate max-w-[150px]' : 'text-rose-500 font-bold'">
                  {{ lead.nextAction || 'Missing' }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>5. Follow-Up Date & Time:</span>
                <span :class="compliance?.hasNextFollowUp ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'">
                  {{ lead.nextFollowUpDate ? formatDate(lead.nextFollowUpDate, 'dd MMM') + ' ' + lead.nextFollowUpTime : 'Missing' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Section: Lead Details (Editable) -->
          <div class="space-y-3">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Lead Profile Details
            </h3>

            <div class="space-y-2.5">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Contact Name</label>
                <input
                  :value="lead.name"
                  @change="handleFieldChange('name', ($event.target as HTMLInputElement).value)"
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold"
                />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Phone Number</label>
                  <input
                    :value="lead.phoneNumber"
                    @change="handleFieldChange('phoneNumber', ($event.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 mb-0.5">WhatsApp Number</label>
                  <input
                    :value="lead.whatsAppNumber"
                    @change="handleFieldChange('whatsAppNumber', ($event.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Email Address</label>
                <input
                  :value="lead.email"
                  @change="handleFieldChange('email', ($event.target as HTMLInputElement).value)"
                  type="email"
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Lead Source</label>
                <select
                  :value="lead.leadSource"
                  @change="handleFieldChange('leadSource', ($event.target as HTMLSelectElement).value)"
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  <option v-for="src in allSources" :key="src" :value="src">{{ src }}</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Priority</label>
                <select
                  :value="lead.priority"
                  @change="handleFieldChange('priority', ($event.target as HTMLSelectElement).value)"
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  <option value="Hot">🔥 Hot</option>
                  <option value="Warm">🟡 Warm</option>
                  <option value="Cold">🔵 Cold</option>
                  <option value="Not Qualified">⚫ Not Qualified</option>
                </select>
              </div>

              <!-- Primary Lead Notes / Instructions -->
              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-0.5 flex items-center justify-between">
                  <span>Lead Notes & Description</span>
                  <span class="text-[10px] text-indigo-500 font-normal">Auto-saves</span>
                </label>
                <textarea
                  :value="lead.notes || ''"
                  @change="handleFieldChange('notes', ($event.target as HTMLTextAreaElement).value)"
                  rows="3"
                  placeholder="Add notes, requirements, or conversation summaries..."
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
                ></textarea>
              </div>

              <div v-if="lead.priority === 'Not Qualified'">
                <label class="block text-[11px] font-bold text-rose-500 mb-0.5">Not Qualified Reason</label>
                <textarea
                  :value="lead.notQualifiedReason || ''"
                  @change="handleFieldChange('notQualifiedReason', ($event.target as HTMLTextAreaElement).value)"
                  rows="2"
                  placeholder="Specify why this lead is not qualified..."
                  class="w-full bg-rose-50/20 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-800 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-rose-500/20"
                ></textarea>
              </div>

              <!-- Project & Property Details (Added with visual divider/border line) -->
              <div class="border-t border-slate-200 dark:border-slate-800 pt-3 mt-3 space-y-3">
                <h4 class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Project & Property Details
                </h4>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Project Type</label>
                    <select
                      :value="lead.projectType || 'Other'"
                      @change="handleFieldChange('projectType', ($event.target as HTMLSelectElement).value)"
                      class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Office">Office</option>
                      <option value="Saloon">Saloon</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Home">Home</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Project Location</label>
                    <input
                      :value="lead.projectLocation || ''"
                      @change="handleFieldChange('projectLocation', ($event.target as HTMLInputElement).value)"
                      placeholder="e.g. Canal Road, Lahore"
                      class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold"
                    />
                  </div>
                </div>

                <!-- Sliders for Area, Budget, and Timeline -->
                <div class="space-y-3 pt-1">
                  <!-- Area Size Slider -->
                  <div class="space-y-1 p-2.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <div class="flex items-center justify-between text-xs font-bold">
                      <span class="text-slate-500 text-[11px]">Area / Size</span>
                      <span class="text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px]">{{ lead.areaSize || 'Not specified' }}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="1"
                      v-model.number="areaIndex"
                      class="w-full h-1.5 accent-indigo-600 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div class="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold px-0.5">
                      <span>700 sq.ft</span>
                      <span>1000</span>
                      <span>2000</span>
                      <span>3000+</span>
                    </div>
                  </div>

                  <!-- Budget Range Slider -->
                  <div class="space-y-1 p-2.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <div class="flex items-center justify-between text-xs font-bold">
                      <span class="text-slate-500 text-[11px]">Budget Range</span>
                      <span class="text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px]">{{ lead.budgetRange || 'Not specified' }}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="1"
                      v-model.number="budgetIndex"
                      class="w-full h-1.5 accent-indigo-600 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div class="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold px-0.5">
                      <span>0.5m</span>
                      <span>1m</span>
                      <span>2m</span>
                      <span>3m-4m</span>
                    </div>
                  </div>

                  <!-- Timeline Slider -->
                  <div class="space-y-1 p-2.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <div class="flex items-center justify-between text-xs font-bold">
                      <span class="text-slate-500 text-[11px]">Timeline</span>
                      <span class="text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px]">{{ lead.timeline || 'Not specified' }}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="1"
                      v-model.number="timelineIndex"
                      class="w-full h-1.5 accent-indigo-600 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div class="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold px-0.5">
                      <span>Immediate</span>
                      <span>0-1 mo</span>
                      <span>1-2 mo</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Section: Assignment & Ownership (PDF Requirements) -->
          <div class="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Assignment & Ownership
            </h3>

            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Assigned Salesperson:</span>
                <select
                  v-if="store.currentUser?.role === 'SuperAdmin'"
                  :value="lead.assignedSalesperson"
                  @change="handleFieldChange('assignedSalesperson', ($event.target as HTMLSelectElement).value)"
                  class="bg-slate-100 dark:bg-slate-800 font-semibold rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                >
                  <option v-for="sp in assignableSalespersons" :key="sp.id" :value="sp.name">{{ sp.name }}</option>
                </select>
                <span v-else class="font-semibold text-slate-700 dark:text-slate-300">
                  {{ lead.assignedSalesperson }}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-500">Lead Location / Territory:</span>
                <input
                  :value="lead.territory"
                  @change="handleFieldChange('territory', ($event.target as HTMLInputElement).value)"
                  class="bg-slate-50 dark:bg-slate-800 font-semibold rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 text-right w-36"
                />
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-500">Assigned By & Date:</span>
                <span class="font-medium text-slate-700 dark:text-slate-300">
                  {{ lead.assignedBy || 'System' }} on {{ formatDate(lead.assignedDate, 'dd MMM yyyy') }}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-500">Last Contacted By:</span>
                <span class="font-medium text-slate-700 dark:text-slate-300">
                  {{ lead.lastContactedBy ? lead.lastContactedBy + ' (' + formatDate(lead.lastContactDate, 'dd MMM') + ')' : 'No contact yet' }}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-500">Next Follow-Up Owner:</span>
                <select
                  :value="lead.nextFollowUpOwner || lead.assignedSalesperson"
                  @change="handleFieldChange('nextFollowUpOwner', ($event.target as HTMLSelectElement).value)"
                  class="bg-slate-100 dark:bg-slate-800 font-semibold rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                >
                  <option v-for="sp in store.salespersons" :key="sp.id" :value="sp.name">{{ sp.name }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Chronological Call & Follow-up History (7 Cols) -->
        <div class="lg:col-span-7 p-6 space-y-5 overflow-y-auto bg-slate-50/40 dark:bg-slate-900/40 flex flex-col h-full">
          <!-- Primary Lead Notes Banner -->
          <div v-if="lead.notes && lead.notes.trim()" class="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 shadow-sm flex items-start gap-3">
            <div class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
              <FileText class="w-4 h-4" />
            </div>
            <div class="space-y-1 min-w-0 flex-1">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Lead Notes & Requirements
                </span>
                <span class="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                  Original Note
                </span>
              </div>
              <p class="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                {{ lead.notes }}
              </p>
            </div>
          </div>

          <!-- Quick Log New Interaction -->
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus class="w-4 h-4 text-indigo-600" />
                <span>Log New Interaction / Note</span>
              </span>

              <!-- Type pills -->
              <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  @click="newActivityType = 'note'"
                  :class="['px-2 py-1 rounded font-semibold transition-all', newActivityType === 'note' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow' : 'text-slate-500']"
                >
                  Note
                </button>
                <button
                  type="button"
                  @click="newActivityType = 'call'"
                  :class="['px-2 py-1 rounded font-semibold transition-all', newActivityType === 'call' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow' : 'text-slate-500']"
                >
                  Call
                </button>
                <button
                  type="button"
                  @click="newActivityType = 'whatsapp'"
                  :class="['px-2 py-1 rounded font-semibold transition-all', newActivityType === 'whatsapp' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow' : 'text-slate-500']"
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  @click="newActivityType = 'meeting'"
                  :class="['px-2 py-1 rounded font-semibold transition-all', newActivityType === 'meeting' ? 'bg-white dark:bg-slate-800 text-purple-600 shadow' : 'text-slate-500']"
                >
                  Meeting
                </button>
                <button
                  type="button"
                  @click="newActivityType = 'not_qualified'"
                  :class="['px-2 py-1 rounded font-semibold transition-all', newActivityType === 'not_qualified' ? 'bg-white dark:bg-slate-800 text-rose-600 shadow' : 'text-slate-500']"
                >
                  Not Qualified
                </button>
              </div>
            </div>

            <textarea
              v-model="newActivityNotes"
              rows="2"
              :placeholder="newActivityType === 'not_qualified' ? 'Please specify why this lead is Not Qualified...' : 'Record call summary, WhatsApp reply, or meeting outcome...'"
              class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20"
            ></textarea>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-slate-500 font-semibold">Next Follow-up:</span>
                <input
                  v-model="newActivityFollowUpDate"
                  type="date"
                  class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold"
                />
                <input
                  v-model="newActivityFollowUpTime"
                  type="time"
                  class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold"
                />
              </div>

              <button
                @click="handleQuickLogActivity"
                :disabled="!newActivityNotes.trim()"
                class="px-4 py-1.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <Send class="w-3.5 h-3.5" />
                <span>Save Entry</span>
              </button>
            </div>
          </div>

          <!-- Chronological Activity Timeline List -->
          <div class="flex-1 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <History class="w-4 h-4 text-slate-400" />
                <span>Chronological History ({{ activities.length }} Entries)</span>
              </h3>
              <span class="text-[10px] text-slate-400">Date | Time | Channel | Rep | Status</span>
            </div>

            <!-- Timeline Entries -->
            <div class="space-y-3 pr-1">
              <div
                v-for="act in activities"
                :key="act.id"
                class="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 relative"
              >
                <!-- Entry Header matching PDF format -->
                <div class="flex items-center justify-between flex-wrap gap-1 text-[11px] border-b border-slate-100 dark:border-slate-700 pb-1.5">
                  <div class="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span class="text-indigo-600 dark:text-indigo-400">{{ act.date }}</span>
                    <span>|</span>
                    <span>{{ act.time }}</span>
                    <span>|</span>
                    <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 font-semibold">{{ act.channel }}</span>
                    <span>|</span>
                    <span class="text-slate-600 dark:text-slate-300 font-medium">{{ act.salesperson }}</span>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                      {{ act.attendedOrResponded }}
                    </span>
                    <StageBadge :stage="act.status" size="sm" />
                  </div>
                </div>

                <!-- Notes -->
                <p class="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  {{ act.notes }}
                </p>

                <!-- Next follow-up tag -->
                <div v-if="act.nextFollowUp" class="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 pt-1">
                  <Clock class="w-3 h-3" />
                  <span>Next: {{ act.nextFollowUp }}</span>
                </div>
              </div>

              <div v-if="activities.length === 0" class="text-center py-10 text-slate-400">
                <History class="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p class="font-bold text-xs">No activity recorded yet</p>
                <p class="text-[11px] text-slate-500">Log a cold call, WhatsApp message, or note to begin the audit trail.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- In-App Delete Confirmation Modal (NO BROWSER ALERT) -->
    <div
      v-if="isDeleteConfirmOpen && lead"
      class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      @click.self="isDeleteConfirmOpen = false"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="flex items-start gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Trash2 class="w-6 h-6" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">Delete Lead</h3>
            <p class="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Permanently delete <strong>{{ lead.name || lead.companyName }}</strong>?
            </p>
          </div>
          <button
            @click="isDeleteConfirmOpen = false"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Warning Disclaimer -->
        <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle class="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <span>This will permanently delete this lead from <strong>MongoDB Atlas</strong>. This action cannot be undone.</span>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            @click="isDeleteConfirmOpen = false"
            :disabled="isDeleting"
            class="px-4 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleDeleteLeadFromDrawer"
            :disabled="isDeleting"
            class="px-4 py-2 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>{{ isDeleting ? 'Deleting from Database...' : 'Yes, Delete Lead' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
