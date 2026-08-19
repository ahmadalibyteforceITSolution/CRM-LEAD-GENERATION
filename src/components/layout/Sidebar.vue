<script setup lang="ts">
import { computed } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import {
  LayoutList,
  Kanban,
  CheckSquare,
  BarChart3,
  Flame,
  Clock,
  AlertTriangle,
  UserX,
  PhoneOff,
  FileText,
  ShieldAlert,
  Users,
  Building2,
  Calendar
} from 'lucide-vue-next';

const store = useCRMStore();

function setView(view: 'table' | 'kanban' | 'queues' | 'analytics') {
  store.currentView = view;
  if (view !== 'queues') {
    store.activeQueueFilter = 'all';
  }
  store.isMobileSidebarOpen = false;
}

function selectQueue(queueKey: any) {
  store.currentView = 'queues';
  store.activeQueueFilter = queueKey;
  store.isMobileSidebarOpen = false;
}

const queuesList = computed(() => [
  {
    id: 'due_today',
    label: 'Due Today',
    icon: Calendar,
    count: store.queueFollowUpsDueToday.length,
    color: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20'
  },
  {
    id: 'overdue',
    label: 'Overdue Follow-Ups',
    icon: AlertTriangle,
    count: store.queueOverdueFollowUps.length,
    color: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20'
  },
  {
    id: 'upcoming',
    label: 'Upcoming Follow-Ups',
    icon: Clock,
    count: store.queueUpcomingFollowUps.length,
    color: 'text-sky-500 bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/20'
  },
  {
    id: 'hot_leads',
    label: 'Hot Leads Action',
    icon: Flame,
    count: store.queueHotLeadsRequiringAction.length,
    color: 'text-orange-500 bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/20'
  },
  {
    id: 'proposals_pending',
    label: 'Proposals Pending',
    icon: FileText,
    count: store.queueProposalsRequiringFollowUp.length,
    color: 'text-purple-500 bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20'
  },
  {
    id: 'not_contacted',
    label: 'Not Contacted',
    icon: UserX,
    count: store.queueNotContacted.length,
    color: 'text-slate-500 bg-slate-500/10 dark:bg-slate-500/20 border-slate-500/20'
  },
  {
    id: 'no_response',
    label: 'No Response / Busy',
    icon: PhoneOff,
    count: store.queueNoResponse.length,
    color: 'text-yellow-600 bg-yellow-500/10 dark:bg-yellow-500/20 border-yellow-500/20'
  },
  {
    id: 'missing_rules',
    label: 'Missing 5 Rules',
    icon: ShieldAlert,
    count: store.nonCompliantLeads.length,
    color: 'text-red-500 bg-red-500/10 dark:bg-red-500/20 border-red-500/20'
  }
]);
</script>

<template>
  <!-- Mobile Backdrop Overlay -->
  <div
    v-if="store.isMobileSidebarOpen"
    @click="store.isMobileSidebarOpen = false"
    class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden"
  ></div>

  <!-- Sidebar Component -->
  <aside
    :class="[
      'w-64 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex flex-col justify-between h-full select-none z-40 transition-transform duration-300 ease-in-out',
      'fixed inset-y-0 left-0 lg:static lg:translate-x-0',
      store.isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
    ]"
  >
    <div class="p-4 space-y-6 overflow-y-auto">
      <!-- Main Views -->
      <div>
        <div class="flex items-center justify-between px-2.5 mb-2">
          <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Workspace Views
          </span>
          <button
            @click="store.isMobileSidebarOpen = false"
            class="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
        <nav class="space-y-1">
          <button
            @click="setView('table')"
            :class="[
              'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all',
              store.currentView === 'table' && store.activeQueueFilter === 'all'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <LayoutList class="w-4 h-4 text-indigo-500" />
              <span>All Leads Directory</span>
            </div>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
              {{ store.leads.length }}
            </span>
          </button>

          <button
            @click="setView('kanban')"
            :class="[
              'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all',
              store.currentView === 'kanban'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <Kanban class="w-4 h-4 text-purple-500" />
              <span>11-Stage Pipeline</span>
            </div>
            <span class="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded">
              Kanban
            </span>
          </button>

          <button
            @click="setView('queues')"
            :class="[
              'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all',
              store.currentView === 'queues' && store.activeQueueFilter === 'all'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <CheckSquare class="w-4 h-4 text-emerald-500" />
              <span>Smart Follow-Up Hub</span>
            </div>
            <span v-if="store.queueOverdueFollowUps.length > 0" class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          </button>

          <button
            @click="setView('analytics')"
            :class="[
              'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all',
              store.currentView === 'analytics'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <BarChart3 class="w-4 h-4 text-cyan-500" />
              <span>Lead Gen Analytics</span>
            </div>
            <span class="text-[10px] text-emerald-500 font-bold">ROI</span>
          </button>
        </nav>
      </div>

      <!-- Smart Follow-Up Queues -->
      <div>
        <div class="px-2.5 mb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Priority Queues</span>
          <span class="text-[10px] lowercase text-slate-400">auto-updating</span>
        </div>
        <div class="space-y-1">
          <button
            v-for="q in queuesList"
            :key="q.id"
            @click="selectQueue(q.id)"
            :class="[
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
              store.activeQueueFilter === q.id && store.currentView === 'queues'
                ? 'bg-slate-200/80 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            ]"
          >
            <div class="flex items-center gap-2 truncate">
              <component :is="q.icon" class="w-3.5 h-3.5 flex-shrink-0" :class="q.color.split(' ')[0]" />
              <span class="truncate">{{ q.label }}</span>
            </div>
            <span
              v-if="q.count > 0"
              :class="[
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full border',
                q.color
              ]"
            >
              {{ q.count }}
            </span>
            <span v-else class="text-[10px] text-slate-400">0</span>
          </button>
        </div>
      </div>

      <!-- Sales Team Breakdown -->
      <div>
        <div class="px-2.5 mb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Sales Representatives
        </div>
        <div class="space-y-1">
          <div
            v-for="rep in store.salespersons"
            :key="rep.id"
            @click="store.selectedSalespersonFilter = store.selectedSalespersonFilter === rep.name ? 'all' : rep.name; store.isMobileSidebarOpen = false"
            :class="[
              'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer',
              store.selectedSalespersonFilter === rep.name
                ? 'bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 font-semibold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'
            ]"
          >
            <div class="flex items-center gap-2 truncate">
              <img :src="rep.avatar" class="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
              <span class="truncate font-medium">{{ rep.name }}</span>
            </div>
            <span class="text-[10px] text-slate-500 dark:text-slate-400">
              {{ store.leads.filter(l => l.assignedSalesperson === rep.name).length }} leads
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom summary footer -->
    <div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
      <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Active Pipeline</span>
        <span class="font-bold text-slate-900 dark:text-slate-100">
          ${{ store.leads.reduce((acc, l) => acc + (l.dealValue || 0), 0).toLocaleString() }}
        </span>
      </div>
      <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
        <span>Auto-sync enabled</span>
      </div>
    </div>
  </aside>
</template>
