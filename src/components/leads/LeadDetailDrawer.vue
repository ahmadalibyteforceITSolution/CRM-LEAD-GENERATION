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
  CheckCircle2
} from 'lucide-vue-next';

const store = useCRMStore();
const lead = computed(() => store.activeLead);
const activities = computed(() => store.activeLeadActivities);
const compliance = computed(() => lead.value ? store.checkLeadCompliance(lead.value) : null);

// Quick Add Note / Custom Activity state
const newActivityType = ref<'note' | 'call' | 'whatsapp' | 'meeting'>('note');
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
  let attended: 'Answered' | 'Replied' | 'Attended' | 'Scheduled' = 'Answered';

  if (newActivityType.value === 'whatsapp') {
    channel = 'WhatsApp Chat';
    attended = 'Replied';
  } else if (newActivityType.value === 'meeting') {
    channel = 'Meeting';
    attended = 'Scheduled';
  } else if (newActivityType.value === 'note') {
    channel = 'Website Enquiry';
    attended = 'Attended';
  }

  store.addActivityItem({
    leadId: lead.value.id,
    date: formatDate(today, 'dd MMM'),
    time: nowTime,
    channel,
    salesperson: store.currentSalesperson,
    attendedOrResponded: attended,
    status: lead.value.stage,
    notes: newActivityNotes.value.trim(),
    nextFollowUp: nextFmt,
    type: newActivityType.value
  });

  // Update lead follow-up
  if (newActivityFollowUpDate.value) {
    store.updateLead(lead.value.id, {
      lastContactedBy: store.currentSalesperson,
      lastContactDate: today,
      lastContactTime: nowTime,
      nextFollowUpDate: newActivityFollowUpDate.value,
      nextFollowUpTime: newActivityFollowUpTime.value,
      nextAction: newActivityNotes.value.slice(0, 50)
    });
  }

  newActivityNotes.value = '';
}

function handleFieldChange(field: string, value: any) {
  if (lead.value) {
    store.updateLead(lead.value.id, { [field]: value });
  }
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
    <div class="w-full max-w-4xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
      <!-- Drawer Top Bar -->
      <div class="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
            {{ lead.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-extrabold text-slate-900 dark:text-white">{{ lead.name }}</h2>
              <PriorityBadge :priority="lead.priority" size="sm" />
              <StageBadge :stage="lead.stage" size="sm" />
            </div>
            <div class="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span class="font-semibold text-slate-700 dark:text-slate-300">{{ lead.companyName }}</span>
              <span>•</span>
              <span class="flex items-center gap-1"><MapPin class="w-3 h-3 text-slate-400" /> {{ lead.city || 'No city' }}</span>
              <span>•</span>
              <span class="font-mono text-emerald-600 font-bold">${{ (lead.dealValue || 0).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Cold Call Action -->
          <button
            @click="store.openQuickCall(lead.id)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
          >
            <PhoneCall class="w-3.5 h-3.5" />
            <span>Call Lead</span>
          </button>

          <!-- WhatsApp Action -->
          <button
            @click="store.openQuickWhatsApp(lead.id)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <MessageCircle class="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <!-- Close -->
          <button
            @click="closeDrawer"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Drawer Body: Grid layout (Left: Info & Ownership, Right: Timeline & Notes) -->
      <div class="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 text-xs">
        <!-- LEFT COLUMN: Lead Information & Ownership (5 Cols) -->
        <div class="lg:col-span-5 p-6 space-y-6 overflow-y-auto">
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

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Company Name</label>
                <input
                  :value="lead.companyName"
                  @change="handleFieldChange('companyName', ($event.target as HTMLInputElement).value)"
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

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Business / Industry</label>
                  <input
                    :value="lead.industry"
                    @change="handleFieldChange('industry', ($event.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 mb-0.5">City / Location</label>
                  <input
                    :value="lead.city"
                    @change="handleFieldChange('city', ($event.target as HTMLInputElement).value)"
                    class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Full Physical Address</label>
                <input
                  :value="lead.fullAddress"
                  @change="handleFieldChange('fullAddress', ($event.target as HTMLInputElement).value)"
                  placeholder="Street, Suite, ZIP Code"
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Service Required</label>
                <input
                  :value="lead.serviceRequired"
                  @change="handleFieldChange('serviceRequired', ($event.target as HTMLInputElement).value)"
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold"
                />
              </div>

              <div class="grid grid-cols-2 gap-2">
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
                  <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Estimated Deal ($)</label>
                  <input
                    type="number"
                    :value="lead.dealValue"
                    @change="handleFieldChange('dealValue', Number(($event.target as HTMLInputElement).value))"
                    class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-0.5">Notes / Requirements</label>
                <textarea
                  :value="lead.notes"
                  @change="handleFieldChange('notes', ($event.target as HTMLTextAreaElement).value)"
                  rows="2"
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs"
                ></textarea>
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
                  :value="lead.assignedSalesperson"
                  @change="handleFieldChange('assignedSalesperson', ($event.target as HTMLSelectElement).value)"
                  class="bg-slate-100 dark:bg-slate-800 font-semibold rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                >
                  <option v-for="sp in store.salespersons" :key="sp.id" :value="sp.name">{{ sp.name }}</option>
                </select>
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
              </div>
            </div>

            <textarea
              v-model="newActivityNotes"
              rows="2"
              placeholder="Record call summary, WhatsApp reply, or meeting outcome..."
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
  </div>
</template>
