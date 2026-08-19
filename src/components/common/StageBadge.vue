<script setup lang="ts">
import { computed } from 'vue';
import { PipelineStage } from '@/types/crm';

const props = defineProps<{
  stage: PipelineStage | string;
  size?: 'sm' | 'md';
}>();

const stageStyles = computed(() => {
  switch (props.stage) {
    case 'New Lead':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
    case 'Call Attempted':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
    case 'Contacted':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800';
    case 'WhatsApp Sent':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'Interested':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    case 'Follow-Up Required':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
    case 'Meeting Scheduled':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
    case 'Proposal Sent':
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800';
    case 'Negotiation':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
    case 'Won / Closed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700 font-semibold shadow-sm';
    case 'Lost':
      return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
});
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium rounded-md border tracking-tight',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      stageStyles
    ]"
  >
    {{ props.stage }}
  </span>
</template>
