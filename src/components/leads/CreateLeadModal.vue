<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { LeadSource, PipelineStage, LeadPriority, ContactChannel } from '@/types/crm';
import { getTodayString } from '@/utils/dateUtils';
import {
  UserPlus,
  X,
  Sparkles,
  Building,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next';

const store = useCRMStore();

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

// Form fields
const name = ref('');
const companyName = ref('');
const phoneNumber = ref('');
const whatsAppNumber = ref('');
const email = ref('');
const industry = ref('Commercial Services');
const city = ref('');
const fullAddress = ref('');
const serviceRequired = ref('Lead Generation & Outreach');
const leadSource = ref<LeadSource>('Meta Ads');
const stage = ref<PipelineStage>('New Lead');
const priority = ref<LeadPriority>('Warm');
const notQualifiedReason = ref('');
const assignedSalesperson = ref('Laiba Khan');
const territory = ref('North America');
const notes = ref('');
const nextAction = ref('First Cold Call & WhatsApp Outreach');
const nextFollowUpDate = ref(getTodayString());
const nextFollowUpTime = ref('14:00');
const preferredChannel = ref<ContactChannel>('Cold Call');

// Project details fields
const projectType = ref('Residential');

const budgetOptions = ['0.5-1m', '1m-2m', '2m-3m', '3m-4m range'];
const budgetValueIndex = ref(1); // Default to '1m-2m'
const budgetRange = computed(() => budgetOptions[budgetValueIndex.value]);

const areaOptions = ['700-1000sq.feet', '1000-2000 sq.ft', '2000-3000 sq.ft', 'above 3000 sq.ft'];
const areaValueIndex = ref(1); // Default to '1000-2000 sq.ft'
const areaSize = computed(() => areaOptions[areaValueIndex.value]);

const timelineOptions = ['Immediately', '0-1 month', '1-2 month'];
const timelineValueIndex = ref(0); // Default to 'Immediately'
const timeline = computed(() => timelineOptions[timelineValueIndex.value]);

const projectLocation = ref('');

// Validation state
const showValidationPopup = ref(false);
const missingFieldNames = ref<string[]>([]);
const touched = ref(false);

function getNumericDealValue(budget: string): number {
  if (budget === '0.5-1m') return 750000;
  if (budget === '1m-2m') return 1500000;
  if (budget === '2m-3m') return 2500000;
  if (budget === '3m-4m range') return 3500000;
  return 0;
}

function syncWhatsAppWithPhone() {
  whatsAppNumber.value = phoneNumber.value;
}

function handlePhoneBlur() {
  if (!whatsAppNumber.value) {
    syncWhatsAppWithPhone();
  }
}

const assignableSalespersons = computed(() => {
  return store.salespersons.filter(sp => sp.role !== 'SuperAdmin' && sp.name.toLowerCase() !== 'superadmin');
});

function validateFields(): boolean {
  touched.value = true;
  const missing: string[] = [];

  if (!name.value.trim()) missing.push('Contact Name');
  if (!phoneNumber.value.trim()) missing.push('Phone Number');
  if (!whatsAppNumber.value.trim()) missing.push('WhatsApp Number');
  if (!companyName.value.trim()) missing.push('Company / Organization');
  if (!email.value.trim()) missing.push('Email Address');
  if (!projectLocation.value.trim()) missing.push('Project Location / City');
  if (!projectType.value.trim()) missing.push('Project Type');
  if (!budgetRange.value) missing.push('Budget Range');
  if (!areaSize.value) missing.push('Area / Size');
  if (!timeline.value) missing.push('Timeline');
  if (!leadSource.value) missing.push('Lead Source');
  if (!stage.value) missing.push('Pipeline Stage');
  if (!priority.value) missing.push('Priority');
  if (priority.value === 'Not Qualified' && !notQualifiedReason.value.trim()) {
    missing.push('Not Qualified Reason');
  }
  if (!assignedSalesperson.value || assignedSalesperson.value.toLowerCase() === 'superadmin') {
    missing.push('Assigned Sales Rep');
  }
  if (!nextAction.value.trim()) missing.push('Next Action');
  if (!nextFollowUpDate.value) missing.push('Follow-Up Date');
  if (!nextFollowUpTime.value) missing.push('Follow-Up Time');
  if (!notes.value.trim()) missing.push('Lead Notes / Requirements');

  missingFieldNames.value = missing;
  if (missing.length > 0) {
    showValidationPopup.value = true;
    return false;
  }
  return true;
}

function handleCreateLead() {
  if (store.currentUser?.role !== 'SuperAdmin') {
    alert('Permission denied: Only SuperAdmin is authorized to add leads.');
    store.isCreateLeadModalOpen = false;
    return;
  }

  if (!validateFields()) {
    return;
  }

  // Never assign to SuperAdmin! Leads belong to sales representatives like Laiba Khan
  let finalRep = (assignedSalesperson.value || '').trim();
  if (!finalRep || finalRep.toLowerCase() === 'superadmin') {
    finalRep = assignableSalespersons.value[0]?.name || 'Laiba Khan';
  } else if (finalRep.toLowerCase().includes('laiba')) {
    finalRep = 'Laiba Khan';
  }

  const selectedBudget = budgetRange.value;
  store.addLead({
    name: name.value.trim(),
    companyName: companyName.value.trim(),
    phoneNumber: phoneNumber.value.trim(),
    whatsAppNumber: whatsAppNumber.value.trim(),
    email: email.value.trim(),
    industry: industry.value.trim(),
    city: projectLocation.value.trim() || city.value.trim(),
    fullAddress: fullAddress.value.trim(),
    serviceRequired: serviceRequired.value.trim(),
    leadSource: leadSource.value,
    dealValue: getNumericDealValue(selectedBudget),
    stage: stage.value,
    priority: priority.value,
    notQualifiedReason: notQualifiedReason.value.trim(),
    assignedSalesperson: finalRep,
    territory: territory.value,
    notes: notes.value.trim(),
    nextAction: nextAction.value.trim(),
    nextFollowUpDate: nextFollowUpDate.value,
    nextFollowUpTime: nextFollowUpTime.value,
    preferredChannel: preferredChannel.value,
    projectType: projectType.value,
    areaSize: areaSize.value,
    budgetRange: selectedBudget,
    timeline: timeline.value,
    projectLocation: projectLocation.value.trim()
  });

  // Reset
  name.value = '';
  companyName.value = '';
  phoneNumber.value = '';
  whatsAppNumber.value = '';
  email.value = '';
  city.value = '';
  notes.value = '';
  notQualifiedReason.value = '';
  projectType.value = 'Residential';
  budgetValueIndex.value = 1;
  areaValueIndex.value = 1;
  timelineValueIndex.value = 0;
  projectLocation.value = '';
  nextAction.value = 'First Cold Call & WhatsApp Outreach';
  nextFollowUpDate.value = getTodayString();
  nextFollowUpTime.value = '14:00';
  touched.value = false;
  showValidationPopup.value = false;
  store.isCreateLeadModalOpen = false;
}

watch(() => store.isCreateLeadModalOpen, (isOpen) => {
  if (isOpen) {
    if (store.currentUser?.role !== 'SuperAdmin') {
      alert('Permission denied: Only SuperAdmin is authorized to add leads.');
      store.isCreateLeadModalOpen = false;
      return;
    }
    // Set default assignee to Laiba Khan or active sales rep - NEVER SuperAdmin!
    const defaultRep = assignableSalespersons.value[0]?.name || 'Laiba Khan';
    if (store.currentSalesperson && store.currentSalesperson.toLowerCase() !== 'superadmin') {
      assignedSalesperson.value = store.currentSalesperson;
    } else {
      assignedSalesperson.value = defaultRep;
    }
    touched.value = false;
    showValidationPopup.value = false;
  }
});
</script>

<template>
  <div
    v-if="store.isCreateLeadModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
  >
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden relative">
      
      <!-- Validation Error Pop-up Modal -->
      <div
        v-if="showValidationPopup"
        class="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      >
        <div class="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-2xl shadow-2xl p-5 sm:p-6 max-w-md w-full space-y-4 animate-in zoom-in-95">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-inner">
              <AlertCircle class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-bold text-base text-slate-900 dark:text-white">Required Fields Missing</h3>
              <p class="text-xs text-rose-500 font-semibold">Please fill all fields to create this lead</p>
            </div>
          </div>

          <div class="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 rounded-xl p-3.5 max-h-56 overflow-y-auto space-y-2">
            <p class="text-xs font-bold text-slate-800 dark:text-slate-200">
              The following {{ missingFieldNames.length }} field(s) cannot be empty:
            </p>
            <ul class="text-xs space-y-1.5 text-rose-700 dark:text-rose-300 font-semibold">
              <li v-for="field in missingFieldNames" :key="field" class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                <span>{{ field }}</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            @click="showValidationPopup = false"
            class="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-[0.98]"
          >
            Got It, Let Me Fill All Things
          </button>
        </div>
      </div>

      <!-- Header -->
      <div class="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-sm">
            <UserPlus class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-bold flex items-center gap-2">
              <span>Create New Lead</span>
              <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">SuperAdmin Only</span>
            </h3>
            <p class="text-xs text-slate-300">All fields required for 5-Golden-Rule CRM compliance</p>
          </div>
        </div>

        <button
          @click="store.isCreateLeadModalOpen = false"
          class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Body (Scrollable) -->
      <form @submit.prevent="handleCreateLead" class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
        
        <!-- Contact & Business Core -->
        <div class="space-y-3">
          <h4 class="font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800">
            1. Contact & Organization Information
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lead / Contact Name <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="name"
                type="text"
                placeholder="e.g. Mian Mudassir"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 transition-all',
                  touched && !name.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'
                ]"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company / Organization <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="companyName"
                type="text"
                placeholder="e.g. Individual / Apex Dynamics"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 transition-all',
                  touched && !companyName.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'
                ]"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="phoneNumber"
                @blur="handlePhoneBlur"
                type="text"
                placeholder="e.g. +923233333296"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:ring-2 transition-all',
                  touched && !phoneNumber.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'
                ]"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="font-bold text-slate-700 dark:text-slate-300">
                  WhatsApp Number <span class="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  @click="syncWhatsAppWithPhone"
                  class="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                >
                  Same as phone
                </button>
              </div>
              <input
                v-model="whatsAppNumber"
                type="text"
                placeholder="e.g. +923233333296"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:ring-2 transition-all',
                  touched && !whatsAppNumber.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20'
                ]"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="email"
                type="email"
                placeholder="e.g. mudassertouseef321@gmail.com"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 transition-all',
                  touched && !email.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'
                ]"
              />
            </div>
          </div>
        </div>

        <!-- Project & Property Details -->
        <div class="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <h4 class="font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800">
            2. Project & Requirements
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Project Type <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="projectType"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
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
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Project Location / City <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="projectLocation"
                type="text"
                placeholder="e.g. Canal Road, Lahore"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 transition-all',
                  touched && !projectLocation.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'
                ]"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <!-- Area Slider -->
            <div class="space-y-1.5 p-3.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-slate-500">Area / Size</span>
                <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">{{ areaSize }}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                v-model.number="areaValueIndex"
                class="w-full h-2 accent-indigo-600 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div class="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-extrabold px-0.5">
                <span>700 sq.ft</span>
                <span>1000</span>
                <span>2000</span>
                <span>3000+</span>
              </div>
            </div>

            <!-- Budget Slider -->
            <div class="space-y-1.5 p-3.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-slate-500">Budget Range</span>
                <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">{{ budgetRange }}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                v-model.number="budgetValueIndex"
                class="w-full h-2 accent-indigo-600 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div class="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-extrabold px-0.5">
                <span>0.5m</span>
                <span>1m</span>
                <span>2m</span>
                <span>3m-4m</span>
              </div>
            </div>

            <!-- Timeline Slider -->
            <div class="space-y-1.5 p-3.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-slate-500">Timeline</span>
                <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">{{ timeline }}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="1"
                v-model.number="timelineValueIndex"
                class="w-full h-2 accent-indigo-600 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div class="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-extrabold px-0.5">
                <span>Immediate</span>
                <span>0-1 mo</span>
                <span>1-2 mo</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Lead Source & Qualification -->
        <div class="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <h4 class="font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800">
            3. Qualification & Ownership
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lead Source <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="leadSource"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option v-for="src in allSources" :key="src" :value="src">{{ src }}</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Priority <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="priority"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option value="Hot">🔥 Hot</option>
                <option value="Warm">🟡 Warm</option>
                <option value="Cold">🔵 Cold</option>
                <option value="Not Qualified">⚫ Not Qualified</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Stage <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="stage"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option v-for="s in allStages" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div class="sm:col-span-3">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Sales Rep (Never SuperAdmin) <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="assignedSalesperson"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option v-for="sp in assignableSalespersons" :key="sp.id" :value="sp.name">
                  {{ sp.name }} ({{ sp.role }})
                </option>
              </select>
            </div>
          </div>

          <!-- Conditional Not Qualified Reason -->
          <div v-if="priority === 'Not Qualified'">
            <label class="block font-bold text-rose-500 mb-1">
              Not Qualified Reason <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="notQualifiedReason"
              type="text"
              placeholder="e.g. Wrong location / Mistakenly filled form / Budget too low"
              :class="[
                'w-full bg-rose-50/20 dark:bg-rose-950/10 border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 transition-all',
                touched && !notQualifiedReason.trim() ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-rose-200 dark:border-rose-800'
              ]"
            />
          </div>
        </div>

        <!-- 4. Next Action & Follow-Up -->
        <div class="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <h4 class="font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800">
            4. Next Action & Follow-Up (5 Golden Rules)
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div class="sm:col-span-3">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Next Action <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="nextAction"
                type="text"
                placeholder="e.g. First Cold Call & WhatsApp Outreach"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 transition-all',
                  touched && !nextAction.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'
                ]"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Follow-Up Date <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="nextFollowUpDate"
                type="date"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 transition-all',
                  touched && !nextFollowUpDate ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'
                ]"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Follow-Up Time <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="nextFollowUpTime"
                type="time"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 transition-all',
                  touched && !nextFollowUpTime ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'
                ]"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Preferred Channel <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="preferredChannel"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option value="Cold Call">Cold Call</option>
                <option value="WhatsApp Chat">WhatsApp Chat</option>
                <option value="Email">Email</option>
                <option value="In-Person Meeting">In-Person Meeting</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 5. Internal Notes -->
        <div class="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <label class="block font-bold text-slate-700 dark:text-slate-300">
            Internal Lead Notes & Requirements <span class="text-rose-500">*</span>
          </label>
          <textarea
            v-model="notes"
            rows="3"
            placeholder="Document requirements, client background, or specific follow-up instructions..."
            :class="[
              'w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-3 text-xs font-semibold focus:ring-2 transition-all',
              touched && !notes.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'
            ]"
          ></textarea>
        </div>

        <!-- Footer -->
        <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            @click="store.isCreateLeadModalOpen = false"
            class="px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <UserPlus class="w-4 h-4" />
            <span>Create & Schedule Lead</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
