<script setup lang="ts">
import { computed } from 'vue';
import { LeadPriority } from '@/types/crm';
import { Flame, Sun, Snowflake, XCircle } from 'lucide-vue-next';

const props = defineProps<{
  priority: LeadPriority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}>();

const config = computed(() => {
  switch (props.priority) {
    case 'Hot':
      return {
        label: 'Hot Lead',
        icon: Flame,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
        dotClass: 'bg-rose-500 animate-pulse'
      };
    case 'Warm':
      return {
        label: 'Warm Lead',
        icon: Sun,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
        dotClass: 'bg-amber-500'
      };
    case 'Cold':
      return {
        label: 'Cold Lead',
        icon: Snowflake,
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60',
        dotClass: 'bg-sky-400'
      };
    case 'Not Qualified':
    default:
      return {
        label: 'Not Qualified',
        icon: XCircle,
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        dotClass: 'bg-slate-400'
      };
  }
});
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors select-none',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm font-semibold' : 'px-2.5 py-1 text-xs',
      config.badgeClass
    ]"
  >
    <span :class="['w-1.5 h-1.5 rounded-full', config.dotClass]"></span>
    <component v-if="showIcon" :is="config.icon" class="w-3.5 h-3.5" />
    <span>{{ props.priority }}</span>
  </span>
</template>
