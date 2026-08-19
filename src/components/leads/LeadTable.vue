<script setup lang="ts">
import { computed } from 'vue';
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
  Trash2
} from 'lucide-vue-next';

const store = useCRMStore();

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
    <div class="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 flex-wrap flex-1">
        <!-- Stage Filter -->
        <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span class="text-slate-400 font-medium">Stage:</span>
          <select
            v-model="store.selectedStageFilter"
            class="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="all">All Stages ({{ store.leads.length }})</option>
            <option v-for="s in allStages" :key="s" :value="s">
              {{ s }} ({{ store.leads.filter(l => l.stage === s).length }})
            </option>
          </select>
        </div>

        <!-- Priority Filter -->
        <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span class="text-slate-400 font-medium">Priority:</span>
          <select
            v-model="store.selectedPriorityFilter"
            class="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option v-for="p in allPriorities" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>

        <!-- Source Filter -->
        <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span class="text-slate-400 font-medium">Source:</span>
          <select
            v-model="store.selectedSourceFilter"
            class="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[150px] truncate"
          >
            <option value="all">All Sources</option>
            <option v-for="src in allSources" :key="src" :value="src">{{ src }}</option>
          </select>
        </div>

        <!-- Clear filters button -->
        <button
          v-if="store.selectedStageFilter !== 'all' || store.selectedPriorityFilter !== 'all' || store.selectedSourceFilter !== 'all' || store.selectedSalespersonFilter !== 'all' || store.activeQueueFilter !== 'all'"
          @click="store.selectedStageFilter = 'all'; store.selectedPriorityFilter = 'all'; store.selectedSourceFilter = 'all'; store.selectedSalespersonFilter = 'all'; store.activeQueueFilter = 'all'"
          class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold px-2 py-1"
        >
          Reset All Filters
        </button>
      </div>

      <div class="text-xs text-slate-500 font-medium">
        Showing <strong class="text-slate-900 dark:text-white">{{ store.filteredLeads.length }}</strong> of {{ store.leads.length }} leads
      </div>
    </div>

    <!-- Table Container -->
    <div class="flex-1 overflow-x-auto overflow-y-auto">
      <table class="w-full text-left border-collapse text-xs">
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
                      ${{ lead.dealValue.toLocaleString() }}
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-500 flex items-center gap-1">
                    <Building class="w-3 h-3 text-slate-400" />
                    <span class="font-medium text-slate-700 dark:text-slate-300">{{ lead.companyName || 'Individual' }}</span>
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
