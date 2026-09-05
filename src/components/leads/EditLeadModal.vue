<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { LeadSource, PipelineStage, LeadPriority, ContactChannel } from '@/types/crm';
import { getTodayString } from '@/utils/dateUtils';
import {
  Pencil,
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
  AlertCircle,
  UserCheck,
  Save,
  Tag
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

const budgetOptions = ['0.5-1m', '1m-2m', '2m-3m', '3m-4m range'];
const areaOptions = ['700-1000sq.feet', '1000-2000 sq.ft', '2000-3000 sq.ft', 'above 3000 sq.ft'];
const timelineOptions = ['Immediately', '0-1 month', '1-2 month'];

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
const nextAction = ref('');
const nextFollowUpDate = ref(getTodayString());
const nextFollowUpTime = ref('14:00');
const preferredChannel = ref<ContactChannel>('Cold Call');

// Project details fields
const projectType = ref('Residential');
const budgetRange = ref('1m-2m');
const areaSize = ref('1000-2000 sq.ft');
const timeline = ref('Immediately');
const projectLocation = ref('');
const dealValue = ref(1500000);

const isSaving = ref(false);
const saveSuccess = ref(false);
const saveError = ref('');
const showValidationPopup = ref(false);
const missingFieldNames = ref<string[]>([]);
const touched = ref(false);

// Exclude SuperAdmin from assignable salespersons
const assignableSalespersons = computed(() => {
  return store.salespersons.filter(sp => sp.role !== 'SuperAdmin' && sp.name.toLowerCase() !== 'superadmin');
});

// Populate fields whenever modal opens or editingLead changes
watch(
  () => store.isEditLeadModalOpen,
  (isOpen) => {
    if (isOpen && store.editingLead) {
      const l = store.editingLead;
      name.value = l.name || '';
      companyName.value = l.companyName || '';
      phoneNumber.value = l.phoneNumber || '';
      whatsAppNumber.value = l.whatsAppNumber || '';
      email.value = l.email || '';
      industry.value = l.industry || 'Commercial Services';
      city.value = l.city || '';
      fullAddress.value = l.fullAddress || '';
      serviceRequired.value = l.serviceRequired || 'Lead Generation & Outreach';
      leadSource.value = l.leadSource || 'Meta Ads';
      stage.value = l.stage || 'New Lead';
      priority.value = l.priority || 'Warm';
      notQualifiedReason.value = l.notQualifiedReason || '';
      assignedSalesperson.value = (l.assignedSalesperson && l.assignedSalesperson.toLowerCase() !== 'superadmin') ? l.assignedSalesperson : 'Laiba Khan';
      territory.value = l.territory || 'North America';
      notes.value = l.notes || '';
      nextAction.value = l.nextAction || '';
      nextFollowUpDate.value = l.nextFollowUpDate || getTodayString();
      nextFollowUpTime.value = l.nextFollowUpTime || '14:00';
      preferredChannel.value = l.preferredChannel || 'Cold Call';

      projectType.value = l.projectType || 'Residential';
      budgetRange.value = l.budgetRange || '1m-2m';
      areaSize.value = l.areaSize || '1000-2000 sq.ft';
      timeline.value = l.timeline || 'Immediately';
      projectLocation.value = l.projectLocation || l.city || '';
      dealValue.value = l.dealValue || 1500000;

      saveError.value = '';
      saveSuccess.value = false;
      touched.value = false;
      showValidationPopup.value = false;
    }
  },
  { immediate: true }
);

function onBudgetChange(val: string) {
  budgetRange.value = val;
  if (val === '0.5-1m') dealValue.value = 750000;
  else if (val === '1m-2m') dealValue.value = 1500000;
  else if (val === '2m-3m') dealValue.value = 2500000;
  else if (val === '3m-4m range') dealValue.value = 3500000;
}

function syncWhatsAppWithPhone() {
  whatsAppNumber.value = phoneNumber.value;
}

function closeModal() {
  store.isEditLeadModalOpen = false;
  showValidationPopup.value = false;
}

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

async function handleSaveLead() {
  if (!validateFields()) {
    return;
  }

  const leadId = store.editingLeadId;
  if (!leadId) return;

  isSaving.value = true;
  saveError.value = '';

  try {
    let rep = assignedSalesperson.value.trim();
    if (!rep || rep.toLowerCase() === 'superadmin') {
      rep = 'Laiba Khan';
    }

    await store.updateLead(leadId, {
      name: name.value.trim(),
      companyName: companyName.value.trim(),
      phoneNumber: phoneNumber.value.trim(),
      whatsAppNumber: whatsAppNumber.value.trim(),
      email: email.value.trim(),
      projectType: projectType.value,
      projectLocation: projectLocation.value.trim(),
      city: projectLocation.value.trim() || city.value.trim(),
      fullAddress: fullAddress.value.trim(),
      areaSize: areaSize.value,
      budgetRange: budgetRange.value,
      dealValue: Number(dealValue.value) || 0,
      timeline: timeline.value,
      stage: stage.value,
      priority: priority.value,
      notQualifiedReason: priority.value === 'Not Qualified' ? notQualifiedReason.value.trim() : '',
      assignedSalesperson: rep,
      currentOwner: rep,
      nextFollowUpOwner: rep,
      leadSource: leadSource.value,
      industry: industry.value.trim(),
      serviceRequired: serviceRequired.value.trim(),
      territory: territory.value.trim(),
      notes: notes.value.trim(),
      nextAction: nextAction.value.trim() || 'Cold Call / WhatsApp Outreach',
      nextFollowUpDate: nextFollowUpDate.value,
      nextFollowUpTime: nextFollowUpTime.value,
      preferredChannel: preferredChannel.value
    });

    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
      closeModal();
    }, 500);
  } catch (err: any) {
    saveError.value = err.message || 'Failed to save lead updates.';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div
    v-if="store.isEditLeadModalOpen && store.editingLead"
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    @click.self="closeModal"
  >
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] relative">
      
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
              <p class="text-xs text-rose-500 font-semibold">Please fill all fields before updating lead</p>
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

      <!-- Modal Header -->
      <div class="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm flex-shrink-0">
            <Pencil class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Edit Lead Profile</h2>
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {{ store.editingLead.id }}
              </span>
            </div>
            <p class="text-xs text-slate-500">Edit all profile fields and save immediately to MongoDB database.</p>
          </div>
        </div>

        <button
          @click="closeModal"
          class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Body (Scrollable) -->
      <form @submit.prevent="handleSaveLead" class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
        
        <!-- Error / Success Alert -->
        <div v-if="saveError" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-600 dark:text-rose-300 text-xs">
          <AlertCircle class="w-4 h-4 flex-shrink-0" />
          <span>{{ saveError }}</span>
        </div>
        <div v-if="saveSuccess" class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-600 dark:text-emerald-300 text-xs">
          <CheckCircle2 class="w-4 h-4 flex-shrink-0" />
          <span class="font-bold">Lead saved successfully to MongoDB!</span>
        </div>

        <!-- Section 1: Contact Information -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
            <UserCheck class="w-4 h-4 text-indigo-500" />
            <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">1. Contact Information</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <!-- Full Name -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Contact Name <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="name"
                type="text"
                placeholder="e.g. Mian Mudassir"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 transition-all',
                  touched && !name.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/30'
                ]"
              />
            </div>

            <!-- Company / Agency -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Company / Organization <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Building class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  v-model="companyName"
                  type="text"
                  placeholder="e.g. Individual / Apex Group"
                  :class="[
                    'w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 transition-all',
                    touched && !companyName.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/30'
                  ]"
                />
              </div>
            </div>

            <!-- Phone Number -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Phone Number <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Phone class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  v-model="phoneNumber"
                  type="text"
                  placeholder="e.g. +923233333296"
                  :class="[
                    'w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-medium focus:ring-2 transition-all',
                    touched && !phoneNumber.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/30'
                  ]"
                />
              </div>
            </div>

            <!-- WhatsApp Number -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-bold text-slate-600 dark:text-slate-400">
                  WhatsApp Number <span class="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  @click="syncWhatsAppWithPhone"
                  class="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                >
                  Copy Phone
                </button>
              </div>
              <div class="relative">
                <MessageCircle class="w-3.5 h-3.5 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  v-model="whatsAppNumber"
                  type="text"
                  placeholder="e.g. +923233333296"
                  :class="[
                    'w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-medium focus:ring-2 transition-all',
                    touched && !whatsAppNumber.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/30'
                  ]"
                />
              </div>
            </div>

            <!-- Email Address -->
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Email Address <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Mail class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  v-model="email"
                  type="email"
                  placeholder="e.g. mudassertouseef321@gmail.com"
                  :class="[
                    'w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 transition-all',
                    touched && !email.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/30'
                  ]"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Project & Requirements Details -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
            <Building class="w-4 h-4 text-amber-500" />
            <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">2. Project & Property Details</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <!-- Project Type -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Project Type <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="projectType"
                class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
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

            <!-- Area Size -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Area / Size <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="areaSize"
                class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option v-for="opt in areaOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>

            <!-- Budget Range -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Budget Range <span class="text-rose-500">*</span>
              </label>
              <select
                :value="budgetRange"
                @change="onBudgetChange(($event.target as HTMLSelectElement).value)"
                class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option v-for="opt in budgetOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>

            <!-- Deal Value -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Deal Value (PKR / Rs.) <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <DollarSign class="w-3.5 h-3.5 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  v-model.number="dealValue"
                  type="number"
                  placeholder="e.g. 1500000"
                  class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>

            <!-- Timeline -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Timeline <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="timeline"
                class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option v-for="opt in timelineOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>

            <!-- Project Location -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Project Location / City <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <MapPin class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  v-model="projectLocation"
                  type="text"
                  placeholder="e.g. Canal Road, Lahore"
                  :class="[
                    'w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 transition-all',
                    touched && !projectLocation.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/30'
                  ]"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: CRM Pipeline & Ownership -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
            <Sparkles class="w-4 h-4 text-emerald-500" />
            <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">3. Pipeline & Ownership</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <!-- Pipeline Stage -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Pipeline Stage <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="stage"
                class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option v-for="stg in allStages" :key="stg" :value="stg">{{ stg }}</option>
              </select>
            </div>

            <!-- Priority -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Priority <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="priority"
                class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="Hot">🔥 Hot</option>
                <option value="Warm">🟡 Warm</option>
                <option value="Cold">🔵 Cold</option>
                <option value="Not Qualified">⚫ Not Qualified</option>
              </select>
            </div>

            <!-- Assigned Salesperson (Never SuperAdmin) -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Assigned Sales Rep <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="assignedSalesperson"
                class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option v-for="sp in assignableSalespersons" :key="sp.id" :value="sp.name">
                  {{ sp.name }} ({{ sp.role }})
                </option>
              </select>
            </div>

            <!-- Lead Source -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Lead Source <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="leadSource"
                class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option v-for="src in allSources" :key="src" :value="src">{{ src }}</option>
              </select>
            </div>

            <!-- Preferred Channel -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Preferred Channel <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="preferredChannel"
                class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="Cold Call">Cold Call</option>
                <option value="WhatsApp Chat">WhatsApp Chat</option>
                <option value="Email">Email</option>
                <option value="In-Person Meeting">In-Person Meeting</option>
              </select>
            </div>

            <!-- Territory -->
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Territory</label>
              <input
                v-model="territory"
                type="text"
                placeholder="e.g. Lahore / North"
                class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <!-- Not Qualified Reason (Conditional) -->
          <div v-if="priority === 'Not Qualified'">
            <label class="block text-xs font-bold text-rose-500 mb-1">
              Not Qualified Reason <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="notQualifiedReason"
              type="text"
              placeholder="e.g. Wrong location / Mistakenly filled form / Out of budget"
              :class="[
                'w-full bg-rose-50/30 dark:bg-rose-950/20 border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 transition-all',
                touched && !notQualifiedReason.trim() ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-rose-200 dark:border-rose-800'
              ]"
            />
          </div>
        </div>

        <!-- Section 4: Next Action & Follow-Up (5 Golden Rules) -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
            <Calendar class="w-4 h-4 text-violet-500" />
            <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">4. Next Action & Scheduled Follow-Up</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div class="sm:col-span-3">
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Next Action Required <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="nextAction"
                type="text"
                placeholder="e.g. Call again tomorrow at 4 PM / Send revised catalog"
                :class="[
                  'w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 transition-all',
                  touched && !nextAction.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/30'
                ]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Follow-Up Date <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Calendar class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  v-model="nextFollowUpDate"
                  type="date"
                  :class="[
                    'w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 transition-all',
                    touched && !nextFollowUpDate ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/30'
                  ]"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Follow-Up Time <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Clock class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  v-model="nextFollowUpTime"
                  type="time"
                  :class="[
                    'w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 transition-all',
                    touched && !nextFollowUpTime ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/30'
                  ]"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Section 5: Internal Notes -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-400">
            Internal Lead Notes & Requirements <span class="text-rose-500">*</span>
          </label>
          <textarea
            v-model="notes"
            rows="3"
            placeholder="Record client preferences, requirements, discussion history..."
            :class="[
              'w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl p-3 text-xs font-medium focus:ring-2 transition-all',
              touched && !notes.trim() ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/30'
            ]"
          ></textarea>
        </div>

        <!-- Modal Footer Actions -->
        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            :disabled="isSaving"
            class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all active:scale-[0.98]"
          >
            <Save class="w-4 h-4" />
            <span>{{ isSaving ? 'Saving Changes...' : 'Save Changes' }}</span>
          </button>
        </div>

      </form>

    </div>
  </div>
</template>
