<script setup lang="ts">
import { ref, computed } from 'vue';
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
  CheckCircle2
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
const leadSource = ref<LeadSource>('Google Maps');
const stage = ref<PipelineStage>('New Lead');
const priority = ref<LeadPriority>('Warm');
const assignedSalesperson = ref(store.currentSalesperson);
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

function handleCreateLead() {
  if (!name.value.trim()) {
    alert('Please enter a Lead / Contact Name');
    return;
  }

  const selectedBudget = budgetRange.value;
  store.addLead({
    name: name.value.trim(),
    companyName: companyName.value.trim() || 'Individual',
    phoneNumber: phoneNumber.value.trim(),
    whatsAppNumber: whatsAppNumber.value.trim() || phoneNumber.value.trim(),
    email: email.value.trim(),
    industry: industry.value.trim(),
    city: city.value.trim(),
    fullAddress: fullAddress.value.trim(),
    serviceRequired: serviceRequired.value.trim(),
    leadSource: leadSource.value,
    dealValue: getNumericDealValue(selectedBudget),
    stage: stage.value,
    priority: priority.value,
    assignedSalesperson: assignedSalesperson.value,
    territory: territory.value,
    notes: notes.value.trim(),
    nextAction: nextAction.value.trim() || 'Initial contact outreach',
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
  projectType.value = 'Residential';
  budgetValueIndex.value = 1;
  areaValueIndex.value = 1;
  timelineValueIndex.value = 0;
  projectLocation.value = '';
  store.isCreateLeadModalOpen = false;
}
</script>

<template>
  <div
    v-if="store.isCreateLeadModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
  >
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <UserPlus class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold flex items-center gap-2">
              <span>Add New Lead</span>
              <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200">5-Rule Compliant</span>
            </h3>
            <p class="text-xs text-slate-300">Capture complete lead generation and cold outreach parameters</p>
          </div>
        </div>

        <button
          @click="store.isCreateLeadModalOpen = false"
          class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleCreateLead" class="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
        <!-- Contact & Business Core -->
        <div class="space-y-3">
          <h4 class="font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[11px]">
            1. Contact & Company Information
          </h4>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Lead / Contact Name <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="name"
              type="text"
              placeholder="e.g. Johnathan Vance"
              class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number (Click-to-Call)
              </label>
              <input
                v-model="phoneNumber"
                @blur="handlePhoneBlur"
                type="text"
                placeholder="+1 555-019-2834"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="font-bold text-slate-700 dark:text-slate-300">
                  WhatsApp Number
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
                placeholder="+1 555-019-2834"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input
              v-model="email"
              type="email"
              placeholder="contact@company.com"
              class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
            />
          </div>
        </div>

        <!-- Lead Source & Qualification -->
        <div class="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <h4 class="font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[11px]">
            2. Source & Qualification
          </h4>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lead Source</label>
            <select
              v-model="leadSource"
              class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
            >
              <option v-for="src in allSources" :key="src" :value="src">{{ src }}</option>
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Priority</label>
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
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Stage</label>
              <select
                v-model="stage"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option v-for="s in allStages" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Salesperson</label>
              <select
                v-model="assignedSalesperson"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option v-for="sp in store.salespersons" :key="sp.id" :value="sp.name">{{ sp.name }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Project & Property Details (Added with a border/bar line separator) -->
        <div class="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <h4 class="font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[11px]">
            3. Project & Property Details
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Project Type</label>
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
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Project Location</label>
              <input
                v-model="projectLocation"
                type="text"
                placeholder="e.g. Canal Road, Lahore"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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



        <!-- Footer -->
        <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="store.isCreateLeadModalOpen = false"
            class="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-6 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <UserPlus class="w-4 h-4" />
            <span>Create & Schedule Lead</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
