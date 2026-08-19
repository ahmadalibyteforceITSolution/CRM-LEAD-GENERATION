<script setup lang="ts">
import { computed } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { SmartQueueFilter, Lead } from '@/types/crm';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import StageBadge from '@/components/common/StageBadge.vue';
import RuleHealthBadge from '@/components/common/RuleHealthBadge.vue';
import { formatDate, isFollowUpOverdue, isFollowUpDueToday } from '@/utils/dateUtils';
import {
  Calendar,
  AlertTriangle,
  Clock,
  Flame,
  FileText,
  UserX,
  PhoneOff,
  PhoneCall,
  MessageCircle,
  CheckCircle2,
  Building,
  ArrowRight,
  ShieldAlert,
  Inbox
} from 'lucide-vue-next';

const store = useCRMStore();

const queueTabs = [
  { id: 'due_today', label: 'Due Today', icon: Calendar, color: 'text-amber-500', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  { id: 'overdue', label: 'Overdue Follow-Ups', icon: AlertTriangle, color: 'text-rose-500', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  { id: 'upcoming', label: 'Upcoming Follow-Ups', icon: Clock, color: 'text-sky-500', badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' },
  { id: 'hot_leads', label: 'Hot Leads Requiring Action', icon: Flame, color: 'text-orange-500', badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
  { id: 'proposals_pending', label: 'Proposals Requiring Follow-Up', icon: FileText, color: 'text-purple-500', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { id: 'not_contacted', label: 'Leads Not Contacted', icon: UserX, color: 'text-slate-500', badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  { id: 'no_response', label: 'Leads With No Response', icon: PhoneOff, color: 'text-yellow-600', badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' },
  { id: 'missing_rules', label: 'Missing 5-Rules', icon: ShieldAlert, color: 'text-red-500', badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' }
];

function getQueueCount(id: string): number {
  switch (id) {
    case 'due_today': return store.queueFollowUpsDueToday.length;
    case 'overdue': return store.queueOverdueFollowUps.length;
    case 'upcoming': return store.queueUpcomingFollowUps.length;
    case 'hot_leads': return store.queueHotLeadsRequiringAction.length;
    case 'proposals_pending': return store.queueProposalsRequiringFollowUp.length;
    case 'not_contacted': return store.queueNotContacted.length;
    case 'no_response': return store.queueNoResponse.length;
    case 'missing_rules': return store.nonCompliantLeads.length;
    default: return 0;
  }
}

const activeQueueLeads = computed(() => {
  switch (store.activeQueueFilter) {
    case 'due_today': return store.queueFollowUpsDueToday;
    case 'overdue': return store.queueOverdueFollowUps;
    case 'upcoming': return store.queueUpcomingFollowUps;
    case 'hot_leads': return store.queueHotLeadsRequiringAction;
    case 'proposals_pending': return store.queueProposalsRequiringFollowUp;
    case 'not_contacted': return store.queueNotContacted;
    case 'no_response': return store.queueNoResponse;
    case 'missing_rules': return store.nonCompliantLeads;
    default: return store.filteredLeads;
  }
});
</script>

<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
    <!-- Header & Queue Selector Tabs -->
    <div class="p-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Smart Follow-Up Queues & Outreach Hub</span>
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            System automatically prioritizes follow-up tasks, calls, and WhatsApp touchpoints so zero deals drop.
          </p>
        </div>
      </div>

      <!-- Queue Pills -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          v-for="tab in queueTabs"
          :key="tab.id"
          @click="store.activeQueueFilter = tab.id as SmartQueueFilter"
          :class="[
            'flex items-center gap-2 px-3 py-2 rounded-xl font-bold transition-all border flex-shrink-0',
            store.activeQueueFilter === tab.id
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-[1.02]'
              : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
          ]"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5" :class="store.activeQueueFilter === tab.id ? 'text-white' : tab.color" />
          <span>{{ tab.label }}</span>
          <span
            :class="[
              'px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
              store.activeQueueFilter === tab.id ? 'bg-white/20 text-white' : tab.badgeColor
            ]"
          >
            {{ getQueueCount(tab.id) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Active Queue Leads Cards List -->
    <div class="flex-1 overflow-y-auto p-6 space-y-3.5">
      <div
        v-for="lead in activeQueueLeads"
        :key="lead.id"
        class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
      >
        <!-- Left: Lead Info -->
        <div class="flex items-start gap-3.5 flex-1 cursor-pointer" @click="store.openLeadDetail(lead.id)">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
            {{ lead.name.charAt(0).toUpperCase() }}
          </div>

          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {{ lead.name }}
              </h3>
              <PriorityBadge :priority="lead.priority" size="sm" />
              <StageBadge :stage="lead.stage" size="sm" />
              <RuleHealthBadge :lead="lead" />
            </div>

            <div class="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
              <span class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building class="w-3.5 h-3.5 text-slate-400" />
                {{ lead.companyName || 'Individual' }}
              </span>
              <span>•</span>
              <span>Source: <strong class="text-slate-700 dark:text-slate-200">{{ lead.leadSource }}</strong></span>
              <span>•</span>
              <span>Rep: <strong class="text-slate-700 dark:text-slate-200">{{ lead.assignedSalesperson }}</strong></span>
            </div>

            <!-- Next Action & Due Date Highlight -->
            <div class="pt-1.5 flex items-center gap-2 flex-wrap text-xs">
              <span class="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Action: {{ lead.nextAction || 'Outreach required' }}
              </span>

              <div
                v-if="lead.nextFollowUpDate"
                :class="[
                  'flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg',
                  isFollowUpOverdue(lead.nextFollowUpDate, lead.nextFollowUpTime)
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : isFollowUpDueToday(lead.nextFollowUpDate)
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                ]"
              >
                <Clock class="w-3.5 h-3.5" />
                <span>{{ formatDate(lead.nextFollowUpDate, 'dd MMM') }} {{ lead.nextFollowUpTime }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Fast Action Buttons -->
        <div class="flex items-center gap-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
          <button
            @click="store.openQuickCall(lead.id)"
            class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <PhoneCall class="w-3.5 h-3.5" />
            <span>Call Now</span>
          </button>

          <button
            @click="store.openQuickWhatsApp(lead.id)"
            class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <MessageCircle class="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            @click="store.openLeadDetail(lead.id)"
            class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Open Detail Drawer"
          >
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="activeQueueLeads.length === 0" class="py-20 text-center text-slate-400">
        <Inbox class="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <h3 class="font-extrabold text-base text-slate-700 dark:text-slate-300">Queue is Clear!</h3>
        <p class="text-xs text-slate-500 mt-1">No pending leads in this specific queue. Great work!</p>
      </div>
    </div>
  </div>
</template>
