<script setup lang="ts">
import { computed } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { ShieldCheck, ShieldAlert, Sparkles, Filter, CheckCircle2 } from 'lucide-vue-next';

const store = useCRMStore();

const nonCompliantCount = computed(() => store.nonCompliantLeads.length);
const rate = computed(() => store.complianceRate);
const isFilteringRules = computed(() => store.activeQueueFilter === 'missing_rules');

function toggleRuleFilter() {
  if (store.activeQueueFilter === 'missing_rules') {
    store.activeQueueFilter = 'all';
  } else {
    store.activeQueueFilter = 'missing_rules';
    store.currentView = 'table';
  }
}
</script>

<template>
  <div class="border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white px-3 sm:px-4 py-2 text-[11px] sm:text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-inner">
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30 text-[10px] sm:text-xs">
        <Sparkles class="w-3 h-3 text-indigo-400" />
        <span>5 Golden Rules</span>
      </div>
      <span class="text-slate-200 font-medium text-[11px] sm:text-xs">
        Every lead:
        <strong class="text-white font-semibold">Assigned</strong> +
        <strong class="text-white font-semibold">Status</strong> +
        <strong class="text-white font-semibold">Last Contact</strong> +
        <strong class="text-white font-semibold">Next Action</strong> +
        <strong class="text-white font-semibold">Follow-Up</strong>
      </span>
    </div>

    <div class="flex items-center gap-2.5 self-end sm:self-auto">
      <!-- Health meter -->
      <div class="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700 text-[10px] sm:text-xs">
        <div class="w-14 sm:w-20 h-1.5 sm:h-2 bg-slate-700 rounded-full overflow-hidden flex">
          <div
            class="h-full transition-all duration-500 rounded-full"
            :class="rate >= 90 ? 'bg-emerald-400' : rate >= 70 ? 'bg-amber-400' : 'bg-rose-400'"
            :style="{ width: `${rate}%` }"
          ></div>
        </div>
        <span class="font-bold" :class="rate >= 90 ? 'text-emerald-400' : rate >= 70 ? 'text-amber-400' : 'text-rose-400'">
          {{ rate }}%
        </span>
      </div>

      <!-- Quick Action Button -->
      <button
        v-if="nonCompliantCount > 0"
        @click="toggleRuleFilter"
        :class="[
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all shadow-sm',
          isFilteringRules
            ? 'bg-amber-500 text-slate-950 ring-2 ring-white/50'
            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
        ]"
      >
        <ShieldAlert class="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>{{ isFilteringRules ? 'Showing ' + nonCompliantCount + ' Non-Compliant' : nonCompliantCount + ' Missing Rules - Fix Now' }}</span>
      </button>
      <div v-else class="flex items-center gap-1 text-emerald-400 font-semibold">
        <CheckCircle2 class="w-4 h-4" />
        <span>100% Complete</span>
      </div>
    </div>
  </div>
</template>
