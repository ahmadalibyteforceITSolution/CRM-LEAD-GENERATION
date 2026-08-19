<script setup lang="ts">
import { computed } from 'vue';
import { Lead } from '@/types/crm';
import { useCRMStore } from '@/stores/crmStore';
import { ShieldCheck, ShieldAlert } from 'lucide-vue-next';

const props = defineProps<{
  lead: Lead;
  detailed?: boolean;
}>();

const store = useCRMStore();
const status = computed(() => store.checkLeadCompliance(props.lead));
</script>

<template>
  <div v-if="status.isCompliant" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
    <ShieldCheck class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
    <span>5/5 Rules Met</span>
  </div>
  <div
    v-else
    class="group relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/80 cursor-help"
  >
    <ShieldAlert class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
    <span>{{ 5 - status.missingCount }}/5 Rules</span>

    <!-- Tooltip -->
    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-30 w-48 p-2 rounded-lg bg-slate-900 text-white text-[11px] shadow-xl border border-slate-700 pointer-events-none">
      <div class="font-semibold text-amber-300 mb-1">Missing Requirements:</div>
      <ul class="space-y-0.5">
        <li v-for="field in status.missingFields" :key="field" class="flex items-center gap-1 text-slate-300">
          <span class="text-rose-400 font-bold">✕</span> {{ field }}
        </li>
      </ul>
      <div class="mt-1 text-[10px] text-slate-400 border-t border-slate-800 pt-1">
        Mandatory 5-Rule Standard
      </div>
    </div>
  </div>
</template>
