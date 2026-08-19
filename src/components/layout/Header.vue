<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import {
  Search,
  Plus,
  PhoneCall,
  MessageSquare,
  FileSpreadsheet,
  Bell,
  UserCheck,
  Flame,
  RotateCcw,
  Sparkles
} from 'lucide-vue-next';

const store = useCRMStore();

const isUserMenuOpen = ref(false);
const isBellMenuOpen = ref(false);

const urgentRemindersCount = computed(() => {
  return store.queueOverdueFollowUps.length + store.queueFollowUpsDueToday.length;
});

function handleOpenNewLead() {
  store.isCreateLeadModalOpen = true;
}

function handleOpenImportExport() {
  store.isImportExportModalOpen = true;
}

function handleResetDemo() {
  if (confirm('Reset CRM database back to original realistic sample data?')) {
    store.resetToDemoData();
  }
}
</script>

<template>
  <header class="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
    <!-- Left: Brand & Search -->
    <div class="flex items-center gap-6 flex-1 max-w-2xl">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Sparkles class="w-5 h-5" />
        </div>
        <div>
          <div class="font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 text-base">
            <span>NexLeads</span>
            <span class="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">CRM PRO</span>
            <span class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/80">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>DB Active</span>
            </span>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Lead Gen • Cold Calling • WhatsApp Hub</p>
        </div>
      </div>

      <!-- Search Input -->
      <div class="relative flex-1 hidden md:block">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          v-model="store.searchQuery"
          type="text"
          placeholder="Search by lead name, company, phone, city, notes..."
          class="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
        />
        <button
          v-if="store.searchQuery"
          @click="store.searchQuery = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Right: Quick Actions, Salesperson, Notifications -->
    <div class="flex items-center gap-3">
      <!-- Import / Export CSV -->
      <button
        @click="handleOpenImportExport"
        title="Import / Export Lead Data (CSV)"
        class="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
      >
        <FileSpreadsheet class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>CSV Data</span>
      </button>

      <!-- Reset Demo Data -->
      <button
        @click="handleResetDemo"
        title="Reset Sample Data"
        class="hidden lg:inline-flex items-center gap-1 p-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
      >
        <RotateCcw class="w-4 h-4" />
      </button>

      <!-- Urgent Reminders Dropdown -->
      <div class="relative">
        <button
          @click="isBellMenuOpen = !isBellMenuOpen"
          class="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
          title="Follow-Up Notifications"
        >
          <Bell class="w-4 h-4" />
          <span
            v-if="urgentRemindersCount > 0"
            class="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center shadow-sm animate-bounce"
          >
            {{ urgentRemindersCount }}
          </span>
        </button>

        <!-- Dropdown menu -->
        <div
          v-if="isBellMenuOpen"
          class="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 px-3 z-50 animate-in fade-in slide-in-from-top-2"
        >
          <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span class="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Follow-Up Reminders</span>
            <span class="text-[11px] text-slate-500">{{ urgentRemindersCount }} pending</span>
          </div>

          <div class="mt-2 space-y-1.5 max-h-64 overflow-y-auto pr-1">
            <div
              v-for="lead in store.queueOverdueFollowUps.slice(0, 3)"
              :key="'ov-' + lead.id"
              @click="store.openLeadDetail(lead.id); isBellMenuOpen = false"
              class="p-2 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 cursor-pointer transition-colors"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-rose-700 dark:text-rose-300">{{ lead.name }}</span>
                <span class="text-[10px] font-semibold text-rose-600 bg-rose-200/60 dark:bg-rose-900/80 px-1.5 py-0.5 rounded">OVERDUE</span>
              </div>
              <p class="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">{{ lead.nextAction }}</p>
              <div class="text-[10px] text-slate-400 mt-1">Due: {{ lead.nextFollowUpDate }} {{ lead.nextFollowUpTime }}</div>
            </div>

            <div
              v-for="lead in store.queueFollowUpsDueToday.slice(0, 3)"
              :key="'td-' + lead.id"
              @click="store.openLeadDetail(lead.id); isBellMenuOpen = false"
              class="p-2 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 cursor-pointer transition-colors"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-amber-800 dark:text-amber-300">{{ lead.name }}</span>
                <span class="text-[10px] font-semibold text-amber-700 bg-amber-200/60 dark:bg-amber-900/80 px-1.5 py-0.5 rounded">TODAY</span>
              </div>
              <p class="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">{{ lead.nextAction }}</p>
              <div class="text-[10px] text-slate-400 mt-1">At: {{ lead.nextFollowUpTime }}</div>
            </div>

            <div v-if="urgentRemindersCount === 0" class="text-center py-6 text-xs text-slate-400">
              🎉 All follow-up tasks are up to date!
            </div>
          </div>

          <button
            @click="store.currentView = 'queues'; store.activeQueueFilter = 'due_today'; isBellMenuOpen = false"
            class="w-full mt-2 py-1.5 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline border-t border-slate-100 dark:border-slate-800 pt-2"
          >
            View All Smart Queues →
          </button>
        </div>
      </div>

      <!-- Active Salesperson Selector -->
      <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
        <UserCheck class="w-4 h-4 text-indigo-500" />
        <span class="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">Rep:</span>
        <select
          v-model="store.currentSalesperson"
          class="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
        >
          <option v-for="sp in store.salespersons" :key="sp.id" :value="sp.name">
            {{ sp.name }} ({{ sp.role }})
          </option>
        </select>
      </div>

      <!-- Add Lead Primary Action -->
      <button
        @click="handleOpenNewLead"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
      >
        <Plus class="w-4 h-4 stroke-[2.5]" />
        <span>Add Lead</span>
      </button>
    </div>
  </header>
</template>
