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
  Filter,
  UserCheck,
  Building,
  MapPin,
  Flame,
  CheckCircle2,
  Trash2,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-vue-next';

const store = useCRMStore();
const mobileViewMode = ref<'cards' | 'table'>('cards');

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
  store.updateLead(lead.id, { priority: target.value as LeadPriority });
}

function handleDeleteLead(lead: Lead, event: MouseEvent) {
  event.stopPropagation();
  if (confirm(`Are you sure you want to delete lead "${lead.name}" (${lead.companyName})?`)) {
    store.deleteLead(lead.id);
  }
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
        v-for="lead in store.filteredLeads"
        :key="'m-' + lead.id"
        @click="store.openLeadDetail(lead.id)"
        class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 active:bg-indigo-50/20 transition-colors"
      >
        <!-- Card Top: Name, Value, Priority -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-sm">
              {{ lead.name.charAt(0).toUpperCase() }}
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
              @click="store.openQuickCall(lead.id)"
              class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold transition-colors"
            >
              Log Call
            </button>
            <button
              @click="handleDeleteLead(lead, $event)"
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
          <h3 class="font-bold text-slate-700 dark:text-slate-200 text-sm">No leads match your criteria</h3>
          <p class="text-xs text-slate-500">Try adjusting your filters or search terms.</p>
          <button
            @click="store.isCreateLeadModalOpen = true"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
          >
            Create New Lead
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
            v-for="lead in store.filteredLeads"
            :key="lead.id"
            @click="store.openLeadDetail(lead.id)"
            class="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors group"
          >
            <!-- Lead & Org -->
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-sm">
                  {{ lead.name.charAt(0).toUpperCase() }}
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
                  @click="handleDeleteLead(lead, $event)"
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
                <h3 class="font-bold text-slate-700 dark:text-slate-200 text-sm">No leads match your criteria</h3>
                <p class="text-xs text-slate-500">Try adjusting your filters or search terms, or add a brand new lead.</p>
                <button
                  @click="store.isCreateLeadModalOpen = true"
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
                >
                  Create New Lead
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
