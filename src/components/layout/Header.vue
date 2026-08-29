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
  Sparkles,
  LogOut
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
  <header class="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20">
    <!-- ROW 1 on Mobile / Left side on Desktop: Brand & Mobile Add Lead -->
    <div class="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto sm:flex-1 min-w-0">
      <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <!-- Mobile Sidebar Toggle -->
        <button
          @click="store.isMobileSidebarOpen = !store.isMobileSidebarOpen"
          class="lg:hidden p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0"
          title="Toggle Menu"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>

        <!-- Brand Icon -->
        <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
          <Sparkles class="w-4 h-4" />
        </div>

        <!-- Brand Name & Badges -->
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="font-bold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base whitespace-nowrap">NexLeads</span>
          <span class="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 whitespace-nowrap">PRO</span>
          <span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/80 whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>DB Active</span>
          </span>
        </div>
      </div>

      <!-- Add Lead CTA button on Mobile (top row) -->
      <button
        v-if="store.currentUser?.role === 'SuperAdmin' || store.currentUser?.role === 'Admin'"
        @click="handleOpenNewLead"
        class="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all flex-shrink-0"
      >
        <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Add Lead</span>
      </button>
    </div>

    <!-- Desktop Search Input (Middle) -->
    <div class="relative flex-1 hidden md:block max-w-md">
      <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        v-model="store.searchQuery"
        type="text"
        placeholder="Search leads, company, phone, notes..."
        class="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
      />
      <button
        v-if="store.searchQuery"
        @click="store.searchQuery = ''"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1"
      >
        Clear
      </button>
    </div>

    <!-- ROW 2 on Mobile / Right Controls on Desktop: Rep, Refresh, Bell, CSV, Desktop Add Lead -->
    <div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
      <!-- Active Salesperson Selector -->
      <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 sm:flex-initial min-w-0">
        <UserCheck class="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
        <span class="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline flex-shrink-0">Rep:</span>
        <select
          v-if="store.currentUser?.role === 'SuperAdmin' || store.currentUser?.role === 'Admin'"
          v-model="store.currentSalesperson"
          class="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer w-full truncate"
        >
          <option v-for="sp in store.salespersons" :key="sp.id" :value="sp.name">
            {{ sp.name }}
          </option>
        </select>
        <span v-else class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
          {{ store.currentSalesperson }}
        </span>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <!-- Hard Refresh Sync DB -->
        <button
          @click="store.fetchAllFromDB()"
          :disabled="store.isLoading"
          title="Hard Refresh from MongoDB Database"
          class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
        >
          <RotateCcw class="w-3.5 h-3.5 text-indigo-500" :class="{ 'animate-spin': store.isLoading }" />
          <span class="hidden xl:inline">{{ store.isLoading ? 'Syncing...' : 'Sync DB' }}</span>
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
            class="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 px-3 z-50 animate-in fade-in slide-in-from-top-2"
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
                  <span class="font-bold text-rose-700 dark:text-rose-300 truncate">{{ lead.name }}</span>
                  <span class="text-[10px] font-semibold text-rose-600 bg-rose-200/60 dark:bg-rose-900/80 px-1.5 py-0.5 rounded flex-shrink-0">OVERDUE</span>
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
                  <span class="font-bold text-amber-800 dark:text-amber-300 truncate">{{ lead.name }}</span>
                  <span class="text-[10px] font-semibold text-amber-700 bg-amber-200/60 dark:bg-amber-900/80 px-1.5 py-0.5 rounded flex-shrink-0">TODAY</span>
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

        <!-- Import / Export CSV (Desktop/Tablet) -->
        <button
          @click="handleOpenImportExport"
          title="Import / Export Lead Data (CSV)"
          class="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>CSV</span>
        </button>

        <!-- Desktop Add Lead Button -->
        <button
          v-if="store.currentUser?.role === 'SuperAdmin' || store.currentUser?.role === 'Admin'"
          @click="handleOpenNewLead"
          class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
        >
          <Plus class="w-4 h-4 stroke-[2.5]" />
          <span>Add Lead</span>
        </button>

        <!-- User Profile & Logout Dropdown -->
        <div class="relative">
          <button
            @click="isUserMenuOpen = !isUserMenuOpen"
            class="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            title="User Profile & Settings"
          >
            <img
              :src="store.currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'"
              class="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
          </button>

          <!-- User Menu Dropdown -->
          <div
            v-if="isUserMenuOpen"
            class="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 px-3 z-50 animate-in fade-in slide-in-from-top-2 text-xs"
          >
            <div class="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <img
                :src="store.currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'"
                class="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
              />
              <div class="min-w-0">
                <div class="font-bold text-slate-900 dark:text-white truncate">{{ store.currentUser?.name || store.currentSalesperson }}</div>
                <div class="text-[11px] text-slate-500 truncate">{{ store.currentUser?.email || 'sales@nexleads.io' }}</div>
                <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate">{{ store.currentUser?.role || 'Senior SDR' }}</div>
              </div>
            </div>

            <div class="py-2 space-y-1">
              <button
                @click="store.resetToDemoData(); isUserMenuOpen = false"
                class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors font-medium flex items-center justify-between"
              >
                <span>Reset Demo Database</span>
                <RotateCcw class="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                @click="store.logoutUser(); isUserMenuOpen = false"
                class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold transition-colors"
              >
                <LogOut class="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
