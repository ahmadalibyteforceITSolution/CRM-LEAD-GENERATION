<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { Lead, PipelineStage } from '@/types/crm';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import RuleHealthBadge from '@/components/common/RuleHealthBadge.vue';
import { formatDate, isFollowUpOverdue, isFollowUpDueToday } from '@/utils/dateUtils';
import {
  PhoneCall,
  MessageCircle,
  Clock,
  Building,
  Plus,
  ArrowRight,
  Sparkles,
  MoveRight
} from 'lucide-vue-next';

const store = useCRMStore();

const stages: PipelineStage[] = [
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

function getStageLeads(stage: PipelineStage): Lead[] {
  return store.filteredLeads.filter(l => l.stage === stage);
}

function getStageTotalValue(stage: PipelineStage): number {
  return getStageLeads(stage).reduce((acc, l) => acc + (l.dealValue || 0), 0);
}

// Drag and drop support
const draggedLeadId = ref<string | null>(null);

function onDragStart(leadId: string, event: DragEvent) {
  draggedLeadId.value = leadId;
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', leadId);
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onDrop(targetStage: PipelineStage, event: DragEvent) {
  event.preventDefault();
  const leadId = draggedLeadId.value || event.dataTransfer?.getData('text/plain');
  if (leadId) {
    store.updateLeadStage(leadId, targetStage);
    draggedLeadId.value = null;
  }
}

function getStageHeaderColor(stage: PipelineStage): string {
  switch (stage) {
    case 'New Lead': return 'border-t-blue-500';
    case 'Call Attempted': return 'border-t-indigo-500';
    case 'Contacted': return 'border-t-cyan-500';
    case 'WhatsApp Sent': return 'border-t-emerald-500';
    case 'Interested': return 'border-t-amber-500';
    case 'Follow-Up Required': return 'border-t-orange-500';
    case 'Meeting Scheduled': return 'border-t-purple-500';
    case 'Proposal Sent': return 'border-t-violet-500';
    case 'Negotiation': return 'border-t-teal-500';
    case 'Won / Closed': return 'border-t-emerald-600 bg-emerald-500/5';
    case 'Lost': return 'border-t-slate-400 bg-slate-500/5';
    default: return 'border-t-slate-400';
  }
}

function moveToNextStage(lead: Lead, event: MouseEvent) {
  event.stopPropagation();
  const currentIndex = stages.indexOf(lead.stage);
  if (currentIndex < stages.length - 1) {
    store.updateLeadStage(lead.id, stages[currentIndex + 1]);
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/60 dark:bg-slate-950/60">
    <!-- Kanban Header Info -->
    <div class="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div class="flex items-center gap-2 sm:gap-3">
        <h2 class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 sm:gap-2">
          <span>11-Stage Deal Pipeline</span>
          <span class="text-[11px] font-normal text-slate-500 hidden md:inline">• Drag cards or use quick controls</span>
        </h2>
      </div>      <div class="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300">
        Total Pipeline Value: <strong class="text-indigo-600 dark:text-indigo-400 font-mono font-bold">Rs. {{ store.leads.reduce((a, b) => a + (b.dealValue || 0), 0).toLocaleString() }}</strong>
      </div>
    </div>

    <!-- Horizontal Kanban Columns Container -->
    <div class="flex-1 overflow-x-auto overflow-y-hidden p-2.5 sm:p-4 flex gap-2.5 sm:gap-3.5 items-start select-none touch-pan-x">
      <div
        v-for="stage in stages"
        :key="stage"
        @dragover="onDragOver"
        @drop="onDrop(stage, $event)"
        :class="[
          'w-[270px] sm:w-72 md:w-80 flex-shrink-0 flex flex-col max-h-full rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 border-t-4 shadow-sm transition-all',
          getStageHeaderColor(stage)
        ]"
      >
        <!-- Column Header -->
        <div class="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
              <span>{{ stage }}</span>
              <span class="px-1.5 py-0.2 text-[11px] rounded-full bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-600 dark:text-slate-400">
                {{ getStageLeads(stage).length }}
              </span>
            </div>
            <div class="text-[10px] text-slate-400 font-medium mt-0.5">
              Rs. {{ getStageTotalValue(stage).toLocaleString() }}
            </div>
          </div>

          <button
            @click="store.isCreateLeadModalOpen = true"
            title="Add lead to this stage"
            class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Cards Container (scrollable) -->
        <div class="flex-1 overflow-y-auto p-2 space-y-2.5 min-h-[150px]">
          <div
            v-for="lead in getStageLeads(stage)"
            :key="lead.id"
            draggable="true"
            @dragstart="onDragStart(lead.id, $event)"
            @click="store.openLeadDetail(lead.id)"
            class="p-3 rounded-xl bg-slate-50 hover:bg-white dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-card hover:shadow-card-hover cursor-grab active:cursor-grabbing transition-all group"
          >
            <!-- Card Top: Name & Priority -->
            <div class="flex items-start justify-between gap-1.5">
              <div>
                <h4 class="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                   {{ lead.name }}
                </h4>
                <div class="text-[11px] text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                  <Building class="w-3 h-3 text-slate-400" />
                  <span class="truncate max-w-[130px]">{{ lead.companyName || 'Individual' }}</span>
                </div>
                <div v-if="lead.projectType || lead.areaSize || lead.budgetRange" class="flex flex-wrap gap-1 mt-1 text-[9px] font-semibold">
                  <span v-if="lead.projectType" class="px-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200/50 dark:border-slate-700/50 truncate max-w-[80px]">{{ lead.projectType }}</span>
                  <span v-if="lead.areaSize" class="px-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200/30 truncate max-w-[80px]">{{ lead.areaSize }}</span>
                  <span v-if="lead.budgetRange" class="px-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-200/30 truncate max-w-[80px]">{{ lead.budgetRange }}</span>
                </div>
              </div>
              <PriorityBadge :priority="lead.priority" size="sm" />
            </div>

            <!-- Value & Source -->
            <div class="mt-2 flex items-center justify-between text-[11px]">
              <span class="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/40">
                Rs. {{ (lead.dealValue || 0).toLocaleString() }}
              </span>
              <span class="text-[10px] text-slate-500 font-medium bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                {{ lead.leadSource }}
              </span>
            </div>

            <!-- Next Action Preview -->
            <div class="mt-2 p-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 text-[11px]">
              <div class="text-slate-700 dark:text-slate-300 font-medium truncate">
                {{ lead.nextAction || 'Next action not set' }}
              </div>
              <div
                v-if="lead.nextFollowUpDate"
                :class="[
                  'flex items-center gap-1 text-[10px] mt-1 font-semibold',
                  isFollowUpOverdue(lead.nextFollowUpDate, lead.nextFollowUpTime)
                    ? 'text-rose-600'
                    : isFollowUpDueToday(lead.nextFollowUpDate)
                    ? 'text-amber-600'
                    : 'text-slate-400'
                ]"
              >
                <Clock class="w-2.5 h-2.5" />
                <span>{{ formatDate(lead.nextFollowUpDate, 'dd MMM') }} {{ lead.nextFollowUpTime }}</span>
              </div>
            </div>

            <!-- Card Bottom: Rep, 5-Rule, Quick Action CTAs -->
            <div class="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between" @click.stop>
              <RuleHealthBadge :lead="lead" />

              <div class="flex items-center gap-1">
                <button
                  @click="store.openQuickCall(lead.id)"
                  title="Cold Call"
                  class="p-1 rounded-md bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950 dark:hover:bg-indigo-600 dark:text-indigo-300 transition-colors"
                >
                  <PhoneCall class="w-3 h-3" />
                </button>
                <button
                  @click="store.openQuickWhatsApp(lead.id)"
                  title="WhatsApp"
                  class="p-1 rounded-md bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white dark:bg-emerald-950 dark:hover:bg-emerald-600 dark:text-emerald-300 transition-colors"
                >
                  <MessageCircle class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <!-- Empty placeholder -->
          <div
            v-if="getStageLeads(stage).length === 0"
            class="h-28 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs text-center p-3"
          >
            <span>No leads in {{ stage }}</span>
            <span class="text-[10px] text-slate-400 mt-1">Drop leads here</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
