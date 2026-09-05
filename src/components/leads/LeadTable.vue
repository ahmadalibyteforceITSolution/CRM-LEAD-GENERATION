<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { Lead, PipelineStage, LeadPriority, LeadSource } from '@/types/crm';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import StageBadge from '@/components/common/StageBadge.vue';
import RuleHealthBadge from '@/components/common/RuleHealthBadge.vue';
import { formatDate, isFollowUpOverdue, isFollowUpDueToday } from '@/utils/dateUtils';
import {
  PhoneCall,
  MessageCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  UserCheck,
  Building,
  MapPin,
  Flame,
  CheckCircle2,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  X,
  AlertCircle,
  Pencil
} from 'lucide-vue-next';
import { watch } from 'vue';

const store = useCRMStore();
const mobileViewMode = ref<'cards' | 'table'>('cards');

// --- Pagination State & Logic ---
const currentPage = ref(1);
const itemsPerPage = ref(10);
const pageSizeOptions = [10, 25, 50, 100];

// Reset to page 1 whenever any filter or search query changes
watch(
  [
    () => store.searchQuery,
    () => store.selectedStageFilter,
    () => store.selectedPriorityFilter,
    () => store.selectedSourceFilter,
    () => store.selectedSalespersonFilter,
    () => store.activeQueueFilter,
    () => store.startDateFilter,
    () => store.endDateFilter
  ],
  () => {
    currentPage.value = 1;
  }
);

// If filtered leads change and current page is out of range, clamp it
watch(
  () => store.filteredLeads.length,
  (newLength) => {
    const maxPage = Math.max(1, Math.ceil(newLength / itemsPerPage.value));
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  }
);

const totalLeads = computed(() => store.filteredLeads.length);
const totalPages = computed(() => Math.max(1, Math.ceil(totalLeads.value / itemsPerPage.value)));

const paginatedLeads = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return store.filteredLeads.slice(start, start + itemsPerPage.value);
});

const startItemIndex = computed(() => {
  if (totalLeads.value === 0) return 0;
  return (currentPage.value - 1) * itemsPerPage.value + 1;
});

const endItemIndex = computed(() => {
  return Math.min(currentPage.value * itemsPerPage.value, totalLeads.value);
});

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

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

const allPriorities: LeadPriority[] = ['Hot', 'Warm', 'Cold', 'Not Qualified'];

function handleStageChange(lead: Lead, event: Event) {
  const target = event.target as HTMLSelectElement;
  store.updateLeadStage(lead.id, target.value as PipelineStage);
}

function handlePriorityChange(lead: Lead, event: Event) {
  const target = event.target as HTMLSelectElement;
  const newPriority = target.value as LeadPriority;
  const leadId = lead.id || (lead as any)._id;
  if (!leadId) return;
  
  if (newPriority === 'Not Qualified') {
    const reason = window.prompt(`Please enter the reason why lead "${lead.name}" is Not Qualified:`);
    if (reason === null) {
      target.value = lead.priority;
      return;
    }
    store.updateLead(leadId, { 
      priority: newPriority, 
      notQualifiedReason: reason.trim() 
    });
  } else {
    store.updateLead(leadId, { priority: newPriority });
  }
}

// --- In-App Delete Confirmation Modal & Popup Toast (NO BROWSER ALERTS) ---
const isDeleteConfirmModalOpen = ref(false);
const leadToDelete = ref<Lead | null>(null);
const isDeletingLead = ref(false);

const toastMessage = ref<string | null>(null);
const toastType = ref<'success' | 'error'>('success');
let toastTimer: any = null;

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg;
  toastType.value = type;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = null;
  }, 4000);
}

function openDeleteModal(lead: Lead, event?: MouseEvent) {
  if (event) event.stopPropagation();
  leadToDelete.value = lead;
  isDeleteConfirmModalOpen.value = true;
}

function closeDeleteModal() {
  if (isDeletingLead.value) return;
  isDeleteConfirmModalOpen.value = false;
  leadToDelete.value = null;
}

async function executeDeleteLead() {
  if (!leadToDelete.value) return;
  const lead = leadToDelete.value;
  const targetId = lead.id || (lead as any)._id;
  const leadTitle = lead.name || lead.companyName || 'Lead';

  if (!targetId) {
    closeDeleteModal();
    return;
  }

  isDeletingLead.value = true;
  try {
    const success = await store.deleteLead(targetId);
    isDeletingLead.value = false;
    isDeleteConfirmModalOpen.value = false;
    leadToDelete.value = null;
    if (success) {
      showToast(`Lead "${leadTitle}" was permanently deleted from database.`, 'success');
    } else {
      showToast(`Lead "${leadTitle}" was removed.`, 'success');
    }
  } catch (err: any) {
    isDeletingLead.value = false;
    showToast(`Failed to delete lead: ${err.message || 'Server error'}`, 'error');
  }
}

function resetAllFilters() {
  store.selectedStageFilter = 'all';
  store.selectedPriorityFilter = 'all';
  store.selectedSourceFilter = 'all';
  store.selectedSalespersonFilter = 'all';
  store.activeQueueFilter = 'all';
  store.startDateFilter = '';
  store.endDateFilter = '';
  store.searchQuery = '';
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
    <!-- Filter & Control Toolbar -->
    <div class="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 flex-1">
        <!-- Stage Filter -->
        <div class="flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span class="text-slate-400 font-medium text-[11px] sm:text-xs">Stage:</span>
          <select
            v-model="store.selectedStageFilter"
            class="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer text-xs w-full truncate"
          >
            <option value="all">All Stages ({{ store.leads.length }})</option>
            <option v-for="s in allStages" :key="s" :value="s">
              {{ s }} ({{ store.leads.filter(l => l.stage === s).length }})
            </option>
          </select>
        </div>

        <!-- Priority Filter -->
        <div class="flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span class="text-slate-400 font-medium text-[11px] sm:text-xs">Priority:</span>
          <select
            v-model="store.selectedPriorityFilter"
            class="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer text-xs w-full truncate"
          >
            <option value="all">All Priorities</option>
            <option v-for="p in allPriorities" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>

        <!-- Source Filter -->
        <div class="col-span-2 sm:col-span-1 flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span class="text-slate-400 font-medium text-[11px] sm:text-xs">Source:</span>
          <select
            v-model="store.selectedSourceFilter"
            class="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-full sm:max-w-[140px] truncate text-xs w-full"
          >
            <option value="all">All Sources</option>
            <option v-for="src in allSources" :key="src" :value="src">{{ src }}</option>
          </select>
        </div>

        <!-- Date Range Filter -->
        <div class="col-span-2 sm:col-span-1 flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span class="text-slate-400 font-medium text-[11px] sm:text-xs">From:</span>
          <input
            type="date"
            v-model="store.startDateFilter"
            class="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer text-xs w-24 sm:w-28"
          />
          <span class="text-slate-400 font-medium text-[11px] sm:text-xs">To:</span>
          <input
            type="date"
            v-model="store.endDateFilter"
            class="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer text-xs w-24 sm:w-28"
          />
        </div>

        <!-- Clear filters button -->
        <button
          v-if="store.selectedStageFilter !== 'all' || store.selectedPriorityFilter !== 'all' || store.selectedSourceFilter !== 'all' || store.selectedSalespersonFilter !== 'all' || store.activeQueueFilter !== 'all' || store.startDateFilter || store.endDateFilter"
          @click="store.selectedStageFilter = 'all'; store.selectedPriorityFilter = 'all'; store.selectedSourceFilter = 'all'; store.selectedSalespersonFilter = 'all'; store.activeQueueFilter = 'all'; store.startDateFilter = ''; store.endDateFilter = ''"
          class="col-span-2 sm:col-span-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold px-2 py-1 text-left sm:text-center"
        >
          Reset Filters
        </button>
      </div>

      <div class="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 font-medium border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
        <!-- Mobile View Toggle -->
        <div class="flex items-center md:hidden bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          <button
            @click="mobileViewMode = 'cards'"
            :class="['px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1', mobileViewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500']"
          >
            <LayoutGrid class="w-3 h-3" />
            <span>Cards</span>
          </button>
          <button
            @click="mobileViewMode = 'table'"
            :class="['px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1', mobileViewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500']"
          >
            <TableIcon class="w-3 h-3" />
            <span>Table</span>
          </button>
        </div>

        <div>
          Showing <strong class="text-slate-900 dark:text-white">{{ store.filteredLeads.length }}</strong> of {{ store.leads.length }} leads
        </div>
      </div>
    </div>

    <!-- MOBILE CARDS VIEW (Clean Touch-Friendly for phones) -->
    <div
      v-if="mobileViewMode === 'cards'"
      class="md:hidden flex-1 overflow-y-auto p-3 space-y-3"
    >
      <div
        v-for="lead in paginatedLeads"
        :key="'m-' + lead.id"
        @click="store.openLeadDetail(lead.id)"
        :class="[
          'p-3.5 rounded-2xl border shadow-sm space-y-2.5 active:bg-indigo-50/20 transition-all cursor-pointer',
          store.checkLeadCompliance(lead).isCompliant
            ? 'bg-emerald-50/20 border-emerald-100/50 dark:bg-emerald-950/5 dark:border-emerald-900/30'
            : 'bg-rose-50/15 border-rose-100/50 dark:bg-rose-950/5 dark:border-rose-900/30'
        ]"
      >
        <!-- Card Top: Name, Value, Priority -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-sm">
              {{ (lead?.name || '?').charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <h4 class="font-bold text-slate-900 dark:text-white text-xs truncate">{{ lead.name }}</h4>
              <p class="text-[11px] text-slate-500 truncate flex items-center gap-1">
                <Building class="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span class="truncate">{{ lead.companyName || 'Individual' }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span v-if="lead.dealValue" class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200/80">
              Rs. {{ lead.dealValue.toLocaleString() }}
            </span>
            <PriorityBadge :priority="lead.priority" size="sm" />
          </div>
        </div>

        <!-- Middle Badges & Stage selector -->
        <div class="flex items-center justify-between gap-2 flex-wrap text-xs pt-1 border-t border-slate-100 dark:border-slate-800" @click.stop>
          <div class="flex items-center gap-1.5 flex-wrap">
            <select
              :value="lead.stage"
              @change="handleStageChange(lead, $event)"
              class="text-[11px] font-semibold rounded-lg px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option v-for="s in allStages" :key="s" :value="s">{{ s }}</option>
            </select>
            <RuleHealthBadge :lead="lead" />
          </div>

          <span class="text-[10px] text-slate-400 font-medium truncate">
            {{ lead.assignedSalesperson }}
          </span>
        </div>

        <!-- Next Action Alert -->
        <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs">
          <div class="text-slate-800 dark:text-slate-200 font-medium truncate">
            {{ lead.nextAction || 'No next action scheduled' }}
          </div>
          <div
            v-if="lead.nextFollowUpDate"
            :class="[
              'flex items-center gap-1 text-[10px] mt-1 font-semibold',
              isFollowUpOverdue(lead.nextFollowUpDate, lead.nextFollowUpTime)
                ? 'text-rose-600 dark:text-rose-400'
                : isFollowUpDueToday(lead.nextFollowUpDate)
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            ]"
          >
            <Clock class="w-3 h-3" />
            <span>Due: {{ formatDate(lead.nextFollowUpDate, 'dd MMM') }} {{ lead.nextFollowUpTime }}</span>
          </div>
        </div>

        <!-- Quick Action CTAs -->
        <div class="flex items-center justify-between gap-2 pt-1" @click.stop>
          <div class="flex items-center gap-2">
            <a
              v-if="lead.phoneNumber"
              :href="'tel:' + lead.phoneNumber"
              class="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold"
            >
              <PhoneCall class="w-3.5 h-3.5" />
              <span>Call</span>
            </a>
            <button
              v-if="lead.whatsAppNumber"
              @click="store.openQuickWhatsApp(lead.id)"
              class="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold"
            >
              <MessageCircle class="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              @click="store.openEditLead(lead.id)"
              class="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white dark:bg-amber-950 dark:text-amber-300 text-xs font-bold transition-colors flex items-center gap-1"
              title="Edit Lead Profile"
            >
              <Pencil class="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              @click="store.openQuickCall(lead.id)"
              class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold transition-colors"
            >
              Log Call
            </button>
            <button
              @click="openDeleteModal(lead, $event)"
              class="p-1 text-slate-400 hover:text-rose-600"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="store.filteredLeads.length === 0" class="py-16 text-center text-slate-400">
        <div class="max-w-sm mx-auto space-y-3">
          <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Filter class="w-6 h-6" />
          </div>
          <h3 class="font-bold text-slate-700 dark:text-slate-200 text-sm">
            {{ store.searchQuery ? `No leads found for "${store.searchQuery}"` : (store.leads.length === 0 ? 'No leads in CRM database' : 'No leads match your criteria') }}
          </h3>
          <p class="text-xs text-slate-500">
            {{ store.searchQuery ? 'Check your spelling or try searching by name, company, rep, phone, or notes.' : (store.leads.length === 0 ? 'Get started by creating your first lead.' : 'Try adjusting your filters or date range.') }}
          </p>

          <!-- If search is active: Show Clear Search button (never Create Lead) -->
          <button
            v-if="store.searchQuery"
            @click="store.searchQuery = ''"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Clear Search
          </button>

          <!-- If database has 0 leads AND user is SuperAdmin: Show Create First Lead -->
          <button
            v-else-if="store.leads.length === 0 && store.currentUser?.role === 'SuperAdmin'"
            @click="store.isCreateLeadModalOpen = true"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30"
          >
            Create First Lead
          </button>

          <!-- If filters have no matches: Show Reset Filters -->
          <button
            v-else-if="store.leads.length > 0"
            @click="resetAllFilters"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>

    <!-- DESKTOP & TABLET SPREADSHEET TABLE (also available on mobile if toggled) -->
    <div
      :class="[
        'flex-1 overflow-x-auto overflow-y-auto',
        mobileViewMode === 'cards' ? 'hidden md:block' : 'block'
      ]"
    >
      <table class="w-full min-w-[950px] text-left border-collapse text-xs">
        <thead class="sticky top-0 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur z-10 border-b border-slate-200 dark:border-slate-800">
          <tr class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <th class="py-3 px-4">Lead & Organization</th>
            <th class="py-3 px-4">Direct Contact</th>
            <th class="py-3 px-4">Source & Industry</th>
            <th class="py-3 px-4">Pipeline Stage</th>
            <th class="py-3 px-4">Priority</th>
            <th class="py-3 px-4">5-Rule Standard</th>
            <th class="py-3 px-4">Assigned Rep</th>
            <th class="py-3 px-4">Next Action / Follow-up</th>
            <th class="py-3 px-4 text-right">Quick Outreach</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-200/70 dark:divide-slate-800/70 bg-white/40 dark:bg-slate-900/40">
          <tr
            v-for="lead in paginatedLeads"
            :key="lead.id"
            @click="store.openLeadDetail(lead.id)"
            :class="[
              'cursor-pointer transition-colors group border-b border-slate-200/50 dark:border-slate-800/50',
              store.checkLeadCompliance(lead).isCompliant
                ? 'bg-emerald-50/20 hover:bg-emerald-100/30 dark:bg-emerald-950/5 dark:hover:bg-emerald-900/10'
                : 'bg-rose-50/15 hover:bg-rose-100/25 dark:bg-rose-950/5 dark:hover:bg-rose-900/10'
            ]"
          >
            <!-- Lead & Org -->
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-sm">
                  {{ (lead?.name || '?').charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="font-bold text-slate-900 dark:text-white text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                    <span>{{ lead.name }}</span>
                    <span v-if="lead.dealValue" class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 px-1 rounded">
                      Rs. {{ lead.dealValue.toLocaleString() }}
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-500 flex items-center gap-1">
                    <Building class="w-3 h-3 text-slate-400" />
                    <span class="font-medium text-slate-700 dark:text-slate-300">{{ lead.companyName || 'Individual' }}</span>
                  </div>
                  <div v-if="lead.projectType || lead.areaSize || lead.budgetRange" class="flex flex-wrap gap-1 mt-1 text-[10px] font-semibold">
                    <span v-if="lead.projectType" class="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200/50 dark:border-slate-700/50">{{ lead.projectType }}</span>
                    <span v-if="lead.areaSize" class="px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200/30">{{ lead.areaSize }}</span>
                    <span v-if="lead.budgetRange" class="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-200/30">{{ lead.budgetRange }}</span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Contact -->
            <td class="py-3.5 px-4" @click.stop>
              <div class="space-y-1">
                <div v-if="lead.phoneNumber" class="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                  <a :href="'tel:' + lead.phoneNumber" class="hover:text-indigo-600 flex items-center gap-1">
                    <PhoneCall class="w-3 h-3 text-indigo-500" />
                    <span>{{ lead.phoneNumber }}</span>
                  </a>
                </div>
                <div v-if="lead.whatsAppNumber" class="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <button @click="store.openQuickWhatsApp(lead.id)" class="hover:text-emerald-600 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <MessageCircle class="w-3 h-3" />
                    <span>WA Ready</span>
                  </button>
                </div>
              </div>
            </td>

            <!-- Source & Industry -->
            <td class="py-3.5 px-4">
              <div>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {{ lead.leadSource }}
                </span>
                <div class="text-[11px] text-slate-500 truncate max-w-[140px] mt-0.5">
                  {{ lead.industry }}
                </div>
              </div>
            </td>

            <!-- Pipeline Stage -->
            <td class="py-3.5 px-4" @click.stop>
              <select
                :value="lead.stage"
                @change="handleStageChange(lead, $event)"
                class="text-xs font-semibold rounded-lg px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option v-for="s in allStages" :key="s" :value="s">{{ s }}</option>
              </select>
            </td>

            <!-- Priority -->
            <td class="py-3.5 px-4" @click.stop>
              <select
                :value="lead.priority"
                @change="handlePriorityChange(lead, $event)"
                class="text-xs font-semibold rounded-lg px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="Hot">🔥 Hot</option>
                <option value="Warm">🟡 Warm</option>
                <option value="Cold">🔵 Cold</option>
                <option value="Not Qualified">⚫ Not Qualified</option>
              </select>
            </td>

            <!-- 5-Rule Health Indicator -->
            <td class="py-3.5 px-4" @click.stop>
              <RuleHealthBadge :lead="lead" />
            </td>

            <!-- Assigned Rep -->
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-1.5">
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ lead.assignedSalesperson }}</span>
              </div>
            </td>

            <!-- Next Action & Follow-up -->
            <td class="py-3.5 px-4">
              <div class="max-w-[200px]">
                <p class="font-semibold text-slate-800 dark:text-slate-200 truncate">{{ lead.nextAction || 'None set' }}</p>
                <div
                  v-if="lead.nextFollowUpDate"
                  :class="[
                    'flex items-center gap-1 text-[11px] mt-0.5 font-medium',
                    isFollowUpOverdue(lead.nextFollowUpDate, lead.nextFollowUpTime)
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : isFollowUpDueToday(lead.nextFollowUpDate)
                      ? 'text-amber-600 dark:text-amber-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400'
                  ]"
                >
                  <Clock class="w-3 h-3" />
                  <span>{{ formatDate(lead.nextFollowUpDate, 'dd MMM') }} {{ lead.nextFollowUpTime }}</span>
                  <span v-if="isFollowUpOverdue(lead.nextFollowUpDate, lead.nextFollowUpTime)" class="text-[9px] uppercase px-1 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                    Overdue
                  </span>
                  <span v-else-if="isFollowUpDueToday(lead.nextFollowUpDate)" class="text-[9px] uppercase px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    Today
                  </span>
                </div>
                <div v-else class="text-[10px] text-rose-500 font-bold">
                  ⚠️ No follow-up scheduled
                </div>
              </div>
            </td>

            <!-- Action Buttons -->
            <td class="py-3.5 px-4 text-right" @click.stop>
              <div class="flex items-center justify-end gap-1.5">
                <!-- Edit Lead Button -->
                <button
                  @click="store.openEditLead(lead.id)"
                  title="Edit Lead Profile"
                  class="p-2 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white dark:bg-amber-950/60 dark:hover:bg-amber-600 dark:text-amber-300 transition-colors shadow-sm"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>

                <!-- Cold Call Button -->
                <button
                  @click="store.openQuickCall(lead.id)"
                  title="Log Cold Call"
                  class="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 transition-colors shadow-sm"
                >
                  <PhoneCall class="w-3.5 h-3.5" />
                </button>

                <!-- WhatsApp Button -->
                <button
                  @click="store.openQuickWhatsApp(lead.id)"
                  title="Launch & Log WhatsApp"
                  class="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white dark:bg-emerald-950/60 dark:hover:bg-emerald-600 dark:text-emerald-300 transition-colors shadow-sm"
                >
                  <MessageCircle class="w-3.5 h-3.5" />
                </button>

                <!-- Delete button -->
                <button
                  @click="openDeleteModal(lead, $event)"
                  title="Delete Lead"
                  class="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-if="store.filteredLeads.length === 0">
            <td colspan="9" class="py-16 text-center text-slate-400">
              <div class="max-w-sm mx-auto space-y-3">
                <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Filter class="w-6 h-6" />
                </div>
                <h3 class="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  {{ store.searchQuery ? `No leads found for "${store.searchQuery}"` : (store.leads.length === 0 ? 'No leads in CRM database' : 'No leads match your criteria') }}
                </h3>
                <p class="text-xs text-slate-500">
                  {{ store.searchQuery ? 'Check your spelling or try searching by name, company, rep, phone, or notes.' : (store.leads.length === 0 ? 'Get started by creating your first lead.' : 'Try adjusting your filters or date range.') }}
                </p>

                <!-- If search is active: Show Clear Search button (never Create Lead) -->
                <button
                  v-if="store.searchQuery"
                  @click="store.searchQuery = ''"
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Clear Search
                </button>

                <!-- If database has 0 leads AND user is SuperAdmin: Show Create First Lead -->
                <button
                  v-else-if="store.leads.length === 0 && store.currentUser?.role === 'SuperAdmin'"
                  @click="store.isCreateLeadModalOpen = true"
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30"
                >
                  Create First Lead
                </button>

                <!-- If filters have no matches: Show Reset Filters -->
                <button
                  v-else-if="store.leads.length > 0"
                  @click="resetAllFilters"
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Control Bar -->
    <div
      v-if="totalLeads > 0"
      class="p-3 sm:px-4 sm:py-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-600 dark:text-slate-400 z-10 flex-shrink-0"
    >
      <div class="flex items-center justify-between sm:justify-start gap-3">
        <span class="font-medium text-slate-500">
          Showing <span class="font-bold text-slate-800 dark:text-slate-200">{{ startItemIndex }}</span>–<span class="font-bold text-slate-800 dark:text-slate-200">{{ endItemIndex }}</span> of <span class="font-bold text-slate-800 dark:text-slate-200">{{ totalLeads }}</span> leads
        </span>

        <div class="flex items-center gap-1.5">
          <span class="text-[11px] text-slate-400">Rows:</span>
          <select
            v-model.number="itemsPerPage"
            @change="currentPage = 1"
            class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
        </div>
      </div>

      <div class="flex items-center justify-center sm:justify-end gap-1">
        <!-- First Page Button -->
        <button
          @click="goToPage(1)"
          :disabled="currentPage === 1"
          class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="First Page"
        >
          <ChevronsLeft class="w-3.5 h-3.5" />
        </button>

        <!-- Prev Button -->
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
        >
          <ChevronLeft class="w-3.5 h-3.5" />
        </button>

        <!-- Page Numbers -->
        <div class="flex items-center gap-1 px-1">
          <template v-for="p in totalPages" :key="p">
            <button
              v-if="p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)"
              @click="goToPage(p)"
              :class="[
                'min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center',
                currentPage === p
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              ]"
            >
              {{ p }}
            </button>
            <span
              v-else-if="p === currentPage - 2 || p === currentPage + 2"
              class="text-slate-400 px-0.5"
            >
              ...
            </span>
          </template>
        </div>

        <!-- Next Button -->
        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
        >
          <ChevronRight class="w-3.5 h-3.5" />
        </button>

        <!-- Last Page Button -->
        <button
          @click="goToPage(totalPages)"
          :disabled="currentPage === totalPages"
          class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Last Page"
        >
          <ChevronsRight class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Custom In-App Delete Confirmation Popup Modal (NO BROWSER ALERT) -->
    <div
      v-if="isDeleteConfirmModalOpen && leadToDelete"
      class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      @click.self="closeDeleteModal"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
        <!-- Warning Icon & Title -->
        <div class="flex items-start gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Trash2 class="w-6 h-6" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">Delete Lead</h3>
            <p class="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Are you sure you want to permanently delete this lead?
            </p>
          </div>
          <button
            @click="closeDeleteModal"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Lead Preview Card -->
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div class="font-bold text-slate-900 dark:text-white text-xs truncate">
              {{ leadToDelete.name || 'Unnamed Lead' }}
            </div>
            <PriorityBadge :priority="leadToDelete.priority" size="sm" />
          </div>
          <div class="text-[11px] text-slate-500 flex items-center justify-between gap-2">
            <span class="truncate">{{ leadToDelete.companyName || 'Individual' }}</span>
            <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">{{ leadToDelete.phoneNumber || 'No phone' }}</span>
          </div>
          <div class="text-[11px] text-slate-500 flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
            <span>Assigned: <strong class="text-slate-700 dark:text-slate-300">{{ leadToDelete.assignedSalesperson || 'Unassigned' }}</strong></span>
            <span class="text-emerald-600 font-bold">Rs. {{ (leadToDelete.dealValue || 0).toLocaleString() }}</span>
          </div>
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
            @click="closeDeleteModal"
            :disabled="isDeletingLead"
            class="px-4 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="executeDeleteLead"
            :disabled="isDeletingLead"
            class="px-4 py-2 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>{{ isDeletingLead ? 'Deleting from Database...' : 'Yes, Delete Lead' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Popup Notification (Green Check / Red Notice) -->
    <div
      v-if="toastMessage"
      class="fixed top-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-top-5 duration-300"
    >
      <div
        :class="[
          'p-3.5 rounded-2xl shadow-2xl backdrop-blur border flex items-center gap-3',
          toastType === 'success'
            ? 'bg-slate-900/95 dark:bg-slate-900/95 text-white border-emerald-500/60 shadow-emerald-500/10'
            : 'bg-rose-950/95 text-white border-rose-500/60 shadow-rose-500/10'
        ]"
      >
        <div
          :class="[
            'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
            toastType === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          ]"
        >
          <CheckCircle2 v-if="toastType === 'success'" class="w-4 h-4" />
          <AlertCircle v-else class="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-xs">{{ toastType === 'success' ? 'Database Updated' : 'Notice' }}</div>
          <div class="text-[11px] text-slate-300 truncate">{{ toastMessage }}</div>
        </div>
        <button
          @click="toastMessage = null"
          class="text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>
